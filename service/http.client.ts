import { consoleSrv } from '@pluschong/console-overlay';
import type { SafeAny, SafeObject } from '@pluschong/safe-type';
import axios, {
	type Axios,
	type AxiosRequestConfig,
	type AxiosResponse,
	type CancelTokenSource
} from 'axios';
import { Observable } from 'rxjs';

class HttpClient {
	static instance: HttpClient;
	static getInstance() {
		if (!this.instance) this.instance = new HttpClient();
		return this.instance;
	}

	get(url: string, config?: AxiosRequestConfig) {
		return this.makeObservable(axios.get, url, config);
	}

	delete(url: string, config?: AxiosRequestConfig) {
		return this.makeObservable(axios.delete, url, config);
	}

	post(url: string, data: SafeObject, config?: AxiosRequestConfig) {
		return this.makeObservable(axios.post, url, data, config);
	}

	put(url: string, data: SafeObject, config?: AxiosRequestConfig) {
		return this.makeObservable(axios.put, url, data, config);
	}

	private makeObservable(
		axiosMethod: Axios['get'] | Axios['delete'] | Axios['post'] | Axios['put'],
		...args: SafeAny[]
	): Observable<AxiosResponse> {
		return new Observable(subscriber => {
			// 获取配置对象（最后一个参数）
			const lastArg = args[args.length - 1];
			const config: AxiosRequestConfig =
				typeof lastArg === 'object' && lastArg !== null ? { ...lastArg } : {};

			// 创建取消令牌
			let cancelSource: CancelTokenSource | undefined;
			if (!config.cancelToken) {
				cancelSource = axios.CancelToken.source();
				config.cancelToken = cancelSource.token;
			}

			try {
				// 执行 axios 请求
				// @ts-expect-error - Dynamic axios method call with rest parameters
				axiosMethod(...args)
					.then(response => {
						subscriber.next(response);
						subscriber.complete();
					})
					.catch(error => {
						// 只在非取消错误时记录日志
						if (!axios.isCancel(error)) {
							consoleSrv.error('[http client error]', error);
						}
						subscriber.error(error);
					});
			} catch (error) {
				consoleSrv.error('[http error] --> axiosMethod', error);
				subscriber.error(error);
			}

			// 清理函数：取消请求
			return () => {
				if (cancelSource && config.responseType !== 'stream') {
					cancelSource.cancel('Request cancelled by Observable unsubscription');
				}
			};
		});
	}
}

export default HttpClient.getInstance();
