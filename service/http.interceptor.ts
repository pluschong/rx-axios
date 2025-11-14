import { consoleSrv } from '@pluschong/console-overlay';
import { SafeAny } from '@pluschong/safe-type';
import axios from 'axios';
import {
	Observable,
	catchError,
	finalize,
	mergeMap,
	of,
	retryWhen,
	throwError,
	timeout,
	timer
} from 'rxjs';
import { HttpOption, HttpResponseBase, UseReqHeaders, UseRspErrMsg } from './http.type';

class HttpInterceptor {
	static instance: HttpInterceptor;
	static getInstance() {
		if (!this.instance) this.instance = new HttpInterceptor();
		return this.instance;
	}

	/** 默认配置 */
	private httpOptions = { maxRetryAttempts: 0, maxTimeout: 10000 };
	private interceptorsFuns: {
		headers: UseReqHeaders;
		response: UseRspErrMsg;
	} = {
		headers: () => ({}),
		response: () => {}
	};

	constructor() {
		this.initInterceptors();
	}

	setInterceptorFuns(funs: SafeAny) {
		this.interceptorsFuns = funs;
	}

	intercept(handler: Observable<HttpResponseBase>, reqCfgOptions: HttpOption) {
		const { timeout: _timeout, retry } = reqCfgOptions;
		const maxRetryAttempts =
			typeof retry !== 'undefined' ? retry : this.httpOptions.maxRetryAttempts;
		const maxTimeout = typeof _timeout !== 'undefined' ? _timeout : this.httpOptions.maxTimeout;

		return handler.pipe(
			retryWhen(this.genericRetryStrategy({ maxRetryAttempts })),
			timeout(maxTimeout),
			mergeMap(event => {
				// 若一切都正常，则后续操作
				return this.handleData(event, reqCfgOptions);
			}),
			catchError(err => {
				this.interceptorsFuns.response(err, reqCfgOptions);
				return this.handleData(err, reqCfgOptions);
			})
		);
	}

	private checkCustomError(code: number, reqCfgOptions: HttpOption) {
		let success = false;
		switch (code) {
			case 0:
			case 200:
				success = true;
				break;
			case 1:
				// 请登录后进行此操作
				break;
			default:
				break;
		}

		return success;
	}

	/*eslint no-case-declarations: "off"*/
	private handleData(event: HttpResponseBase, reqCfgOptions: HttpOption): Observable<SafeAny> {
		/** 接口返回错误码对应字段 (各不统一醉了) */
		const codeKeys = ['errcode', 'error', 'code', 'err_code'];
		const status =
			event.status || ((event as SafeAny).response ? (event as SafeAny).response.status : -1);
		switch (status) {
			case 200:
			case 201:
			case 204:
				let code = -1;
				codeKeys.forEach(key => {
					if (typeof event.data[key] !== 'undefined') {
						code = event.data[key];
					}
				});

				if (code === -1 || this.checkCustomError(code, reqCfgOptions)) {
					return of(event.data);
				} else {
					return throwError(() => event.data);
				}
			case 401:
				break;
			case 403:
			case 404:
			case 500:
				break;
			default:
				break;
		}

		return throwError(() => event);
	}

	private genericRetryStrategy =
		({
			maxRetryAttempts = 0,
			scalingDuration = 1000,
			excludedStatusCodes = [401, 404]
		}: {
			maxRetryAttempts?: number;
			scalingDuration?: number;
			excludedStatusCodes?: number[];
		} = {}) =>
		(attempts: Observable<SafeAny>) => {
			return attempts.pipe(
				mergeMap((error, i) => {
					const retryAttempt = i + 1;
					// 如果达到最大重试次数或响应的状态码
					// 不是我们想重试的，就抛出错误
					if (
						retryAttempt > maxRetryAttempts ||
						excludedStatusCodes.find(e => e === error.status)
					) {
						return throwError(() => error);
					}

					// 重试的时间间隔不断增长: 1秒、2秒，以此类推
					return timer(retryAttempt * scalingDuration);
				}),
				finalize(() =>
					maxRetryAttempts ? loggerSrv.log('[http]', 'request maximum retries!', 'yellow') : ''
				)
			);
		};

	private initInterceptors() {
		// 添加请求拦截器
		axios.interceptors.request.use(
			config => {
				// 在发送请求之前做些什么
				config.headers = { ...config.headers, ...this.interceptorsFuns.headers(config) };
				return config;
			},
			error => {
				// 对请求错误做些什么
				return Promise.reject(error);
			}
		);

		// 添加响应拦截器
		axios.interceptors.response.use(
			response => {
				// 对响应数据做点什么
				const { status, data } = response;
				return { status, data };
			},
			error => {
				// 对响应错误做点什么
				const { status, data } = error.response;
				return Promise.reject({ status, data });
			}
		);
	}
}

export default HttpInterceptor.getInstance();
