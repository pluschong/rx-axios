import { consoleSrv } from '@pluschong/console-overlay';
import { SafeAny } from '@pluschong/safe-type';
import axios, { Axios, CancelTokenSource } from 'axios';
import { Observable } from 'rxjs';
import httpInterceptor from './http.interceptor';
import { HttpOption, HttpOptions, HttpResponseBase } from './http.type';

class HttpClient {
	static instance: HttpClient;
	static getInstance() {
		if (!this.instance) this.instance = new HttpClient();
		return this.instance;
	}

	get(url: string, reqCfgOptions: HttpOption, options?: HttpOptions) {
		return httpInterceptor.intercept(
			this.makeObservable(axios.get, url, options),
			reqCfgOptions
		); // prettier-ignore
	}

	post(url: string, data: SafeAny, reqCfgOptions: HttpOption, options?: HttpOptions) {
		return httpInterceptor.intercept(
			this.makeObservable(axios.post, url, data, options),
			reqCfgOptions
		);
	}

	put(url: string, data: SafeAny, reqCfgOptions: HttpOption, options?: HttpOptions) {
		return httpInterceptor.intercept(
			this.makeObservable(axios.put, url, data, options),
			reqCfgOptions
		);
	}

	delete(url: string, reqCfgOptions: HttpOption, options?: HttpOptions) {
		return httpInterceptor.intercept(
			this.makeObservable(axios.delete, url, options),
			reqCfgOptions
		);
	}

	private makeObservable(
		axiosMethod: Axios['get'] | Axios['post'] | Axios['put'] | Axios['delete'],
		...args: SafeAny[]
	): Observable<HttpResponseBase> {
		return new Observable(subscriber => {
			const config = Object.assign({}, args[args.length - 1] || {});
			let cancelSource: CancelTokenSource;
			if (!config.cancelToken) {
				cancelSource = axios.CancelToken.source();
				config.cancelToken = cancelSource.token;
			}

			try {
				// @ts-ignore
				axiosMethod(...args)
					.then(res => {
						subscriber.next(res);
					})
					.catch(err => {
						subscriber.error(err);
					})
					.finally(() => {
						subscriber.complete();
					});
			} catch (error) {
				consoleSrv.error('[http error] --> axiosMethod', error);
				subscriber.error(error);
			}

			return () => {
				if (config.responseType === 'stream') {
					return;
				}
				if (cancelSource) {
					cancelSource.cancel();
				}
			};
		});
	}
}

export default HttpClient.getInstance();
