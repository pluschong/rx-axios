import { consoleSrv } from '@pluschong/console-overlay';
import { SafeAny, SafeObject } from '@pluschong/safe-type';
import { isHttpLink } from '@pluschong/utils';
import { map, Observable, tap } from 'rxjs';
import httpClient from './http.client';
import { HttpRequestConfig, HttpResponse, SetHandlers } from './http.type';
import { _handlers } from './http.utils';
import httpInterceptor from './http.interceptor';
import { AxiosResponse } from 'axios';

class HttpService {
	static instance: HttpService;
	static getInstance() {
		if (!this.instance) this.instance = new HttpService();
		return this.instance;
	}

	constructor() {}

	get setHandlers(): SetHandlers {
		return {
			config: handler => (_handlers.config = handler),
			headers: handler => (_handlers.headers = handler),
			params: handler => (_handlers.params = handler),
			observable: handler => (_handlers.observable = handler),
			intercept: handler => (_handlers.intercept = handler),
			error: handler => (_handlers.error = handler),
			proxy: handler => (_handlers.proxy = handler)
		};
	}

	sendRequest(config: HttpRequestConfig, params: SafeObject = {}): Observable<HttpResponse> {
		// 接口配置
		const cfg = _handlers.config(config);
		// 是否拦截，`true`继续走
		const requestProceed = !_handlers.intercept(cfg);
		// 加入默认参数，组成新参数
		const data = cfg.keepIntact ? params : { ..._handlers.params(), ...params };

		this.printParams(`[http request][${cfg.type}] --> `, data, cfg);

		return _handlers.observable(
			requestProceed
				? this.request(cfg, data).pipe(
						tap({
							next: event => {
								this.printParams(`[http response][${cfg.type}] --> `, event, cfg);
							},
							error: err => {
								this.printParams(`[http response][${cfg.type}] --> `, err, cfg, 'red');
							}
						}),
						map(res => {
							// 可在此处处理返回值
							return res;
						})
					)
				: new Observable<HttpResponse>(subscriber => {
						subscriber.error({
							errcode: 11001,
							message: '请求被拦截，不发送请求'
						});
					}).pipe(
						tap({
							error: err => {
								this.printParams(`[http response][${cfg.type}] --> `, err, cfg, 'red');
							}
						})
					),
			cfg
		);
	}

	private request(config: HttpRequestConfig, params: SafeObject): Observable<HttpResponse> {
		let domain = '';
		let route = config.route;
		const proxyCfg = new Map(Object.entries(_handlers.proxy()));
		if (proxyCfg.size > 0) {
			const cfg = Array.from(proxyCfg).filter(([prefix]) => config.route.startsWith(prefix))[0];
			const pathRewrite = cfg ? cfg[1].pathRewrite : false;
			domain = cfg ? cfg[1].target : '';

			if (pathRewrite) {
				route = route.replace(cfg[0], '');
			}
		}

		const url = isHttpLink(config.route)
			? config.route
			: domain
				? new URL(route, domain).href
				: config.route;

		let requestObs: Observable<AxiosResponse>;
		const axiosRequestConfig = {
			timeout: config.timeout,
			headers: config.headers
		};

		switch (config.type) {
			case 'post':
				requestObs = httpClient.post(url, params, axiosRequestConfig);
			case 'get':
				requestObs = httpClient.get(url, { ...axiosRequestConfig, params });
			case 'put':
				requestObs = httpClient.put(url, params, axiosRequestConfig);
			case 'delete':
				requestObs = httpClient.delete(url, { ...axiosRequestConfig, data: params });
		}

		if (requestObs) {
			return httpInterceptor.use(requestObs, config);
		} else {
			throw new Error(`Unsupported request type: ${config.type}`);
		}
	}

	private printParams(tag: string, params: SafeAny, config: HttpRequestConfig, color = 'green') {
		if (!config.silent) consoleSrv.info(`${tag}${config.route}`, params, color);
	}
}

export const httpSrv = HttpService.getInstance();
