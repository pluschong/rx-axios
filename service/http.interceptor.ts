import { consoleSrv } from '@pluschong/console-overlay';
import type { SafeAny } from '@pluschong/safe-type';
import axios, { AxiosResponse } from 'axios';
import { Observable, catchError, mergeMap, of, retry, tap, throwError, timeout, timer } from 'rxjs';
import { HttpRequestConfig } from './http.type';
import { _defConfig, _handlers } from './http.utils';

class HttpInterceptor {
	static instance: HttpInterceptor;
	static getInstance() {
		if (!this.instance) this.instance = new HttpInterceptor();
		return this.instance;
	}

	constructor() {
		this.setAxiosInterceptors();
	}

	use(requestObs: Observable<AxiosResponse>, config: HttpRequestConfig) {
		const { timeout: _timeout, retryCount } = config;
		const maxRetryCount = retryCount ?? _defConfig.retryCount;
		const maxTimeout = _timeout ?? _defConfig.timeout;
		let retryAttemptCount = 0;

		return requestObs.pipe(
			retry({
				count: maxRetryCount,
				delay: (error, retryAttempt) => {
					retryAttemptCount = retryAttempt;
					const excludedStatusCodes = [401, 404];
					return excludedStatusCodes.includes(error.status)
						? throwError(() => error)
						: timer(retryAttempt * 1000);
				}
			}),
			tap({
				finalize: () => {
					if (retryAttemptCount > 0) {
						consoleSrv.warn(
							`[http retry] [${config.type}]--> ${config.route} <${retryAttemptCount}>`,
							config
						);
					}
				}
			}),
			timeout(maxTimeout),
			mergeMap(event => {
				// 若一切都正常，则后续操作
				return this.handleData(event, config);
			}),
			catchError(err => {
				_handlers.error(err, config);
				return this.handleData(err, config);
			})
		);
	}

	private handleData(event: AxiosResponse, config: HttpRequestConfig): Observable<SafeAny> {
		const status = event.status ?? (event as SafeAny).response?.status ?? -1;
		const successStatuses = [200, 201, 204];

		if (successStatuses.includes(status)) {
			let code = -1;
			for (const key of _handlers.codeKeys()) {
				if (typeof event.data[key] !== 'undefined') {
					code = event.data[key];
					break; // 匹配到就停止
				}
			}
			return code === -1 || _handlers.successCode().includes(code)
				? of(event.data)
				: throwError(() => event.data);
		}

		return throwError(() => event);
	}

	private setAxiosInterceptors() {
		axios.interceptors.request.use(
			config => {
				// 在发送请求之前做些什么
				const customHeaders = _handlers.headers(config.headers);
				Object.assign(config.headers, customHeaders);
				return config;
			},
			error => {
				// 对请求错误做些什么
				return Promise.reject(error);
			}
		);

		axios.interceptors.response.use(
			response => {
				// 对响应数据做点什么
				return response;
			},
			error => {
				// 对响应错误做点什么
				if (error.response) {
					const { status, data } = error.response;
					return Promise.reject({ status, data });
				}
				return Promise.reject(error);
			}
		);
	}
}

export default HttpInterceptor.getInstance();
