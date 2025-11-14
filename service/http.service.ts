import { consoleSrv } from '@pluschong/console-overlay';
import { SafeAny, SafeObject } from '@pluschong/safe-type';
import { isHttpLink } from '@pluschong/utils';
import { map, Observable, tap } from 'rxjs';
import httpClient from './http.client';
import httpInterceptor from './http.interceptor';
import { Handlers, HttpRequestConfig, HttpResponse, SetHandlers } from './http.type';

class HttpService {
	static instance: HttpService;
	static getInstance() {
		if (!this.instance) this.instance = new HttpService();
		return this.instance;
	}

	private handlers: Handlers;

	constructor() {
		this.handlers = {
			config: config => config,
			headers: () => ({}),
			params: () => ({}),
			observable: (ob, config) => ob,
			intercept: config => false,
			error: (event, config) => {},
			proxy: () => ({})
		};
		httpInterceptor.setHandlers(this.handlers);
	}

	get setHandlers(): SetHandlers {
		return {
			config: handler => (this.handlers.config = handler),
			headers: handler => (this.handlers.headers = handler),
			params: handler => (this.handlers.params = handler),
			observable: handler => (this.handlers.observable = handler),
			intercept: handler => (this.handlers.intercept = handler),
			error: handler => (this.handlers.error = handler),
			proxy: handler => (this.handlers.proxy = handler)
		};
	}

	sendRequest(config: HttpRequestConfig, params: SafeObject = {}): Observable<HttpResponse> {
		// 接口配置
		const cfg = this.handlers.config(config);
		// 是否拦截，`true`继续走
		const requestProceed = !this.handlers.intercept(cfg);
		// 加入默认参数，组成新参数
		const data = cfg.keepIntact ? params : { ...this.handlers.params(), ...params };

		this.printParams(`[http request][${cfg.type}] --> `, data, cfg);

		return this.handlers.observable(
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
		const proxyCfg = new Map(Object.entries(this.handlers.proxy()));
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

		switch (config.type) {
			case 'post':
				return httpClient.post(url, params, config);
			case 'get':
				return httpClient.get(url, params, config);
			case 'put':
				return httpClient.put(url, params, config);
			case 'delete':
				return httpClient.delete(url, params, config);
			default:
				throw new Error(`Unsupported request type: ${config.type}`);
		}
	}

	private printParams(tag: string, params: SafeAny, config: HttpRequestConfig, color = 'green') {
		if (!config.silent) consoleSrv.info(`${tag}${config.route}`, params, color);
	}
}

export const httpSrv = HttpService.getInstance();
