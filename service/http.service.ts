import { loggerSrv } from '@yasf/logger';
import { SafeAny, SafeArray } from '@yasf/types';
import { isHttpLink } from '@yasf/utils';
import { map, Observable, tap } from 'rxjs';
import _http from './http.client';
import httpInterceptor from './http.interceptor';
import {
	HttpOption,
	HttpParams,
	HttpRes,
	Interceptors,
	ReqParam,
	RspParam,
	UseIntercept,
	UseProxyCfg,
	UseReqDefOption,
	UseReqDefParam,
	UseReqHeaders,
	UseRspErrMsg,
	UseSendBefore
} from './http.type';

class HttpService {
	static instance: HttpService;
	static getInstance() {
		if (!this.instance) {
			this.instance = new HttpService();
		}
		return this.instance;
	}

	private interceptorsFuns: {
		proxy: UseProxyCfg;
		headers: UseReqHeaders;
		options: UseReqDefOption;
		request: UseReqDefParam;
		response: UseRspErrMsg;
		intercept: UseIntercept;
		sendBefore: UseSendBefore;
	};

	constructor() {
		this.interceptorsFuns = {
			proxy: () => ({}),
			headers: () => ({}),
			options: op => op,
			request: op => ({}),
			response: () => {},
			intercept: (op, ob) => ob,
			sendBefore: () => true
		};
		httpInterceptor.setInterceptorFuns(this.interceptorsFuns);
	}

	get interceptors(): Interceptors {
		return {
			proxy: fun => {
				this.interceptorsFuns.proxy = fun;
			},
			headers: fun => {
				this.interceptorsFuns.headers = fun;
			},
			options: fun => {
				this.interceptorsFuns.options = fun;
			},
			request: fun => {
				this.interceptorsFuns.request = fun;
			},
			response: fun => {
				this.interceptorsFuns.response = fun;
			},
			intercept: fun => {
				this.interceptorsFuns.intercept = fun;
			},
			sendBefore: fun => {
				this.interceptorsFuns.sendBefore = fun;
			}
		};
	}

	sendRequest(option: HttpOption, data: HttpParams = {}): Observable<RspParam> {
		// 接口配置
		const options = this.interceptorsFuns.options(option);
		// 是否拦截，`true`正常走
		const isNext = this.interceptorsFuns.sendBefore(options);
		// 默认携带的参数
		const defaultData = {
			...this.interceptorsFuns.request(options)
		};
		// 组成新参数
		const params = options.keepIntact ? data : { ...defaultData, ...data };

		this.printParams(`[http req][${options.type}] --> `, params, options);

		return this.interceptorsFuns.intercept(
			options,
			isNext
				? this.request(options, params).pipe(
						tap({
							next: event => {
								this.printParams(`[http rsp][${options.type}] --> `, event, options);
							},
							error: err => {
								this.printParams(`[http rsp][${options.type}] --> `, err, options, 'red');
							}
						}),
						map(res => {
							return typeof res === 'string' ? { data: res } : { ...res };
						})
					)
				: new Observable<RspParam>(subscriber => {
						subscriber.error({
							err_code: 11001,
							err_msg: '请求被拦截，不发送请求'
						});
					}).pipe(
						tap({
							error: err => {
								this.printParams(`[http rsp][${options.type}] --> `, err, options, 'red');
							}
						})
					)
		);
	}

	private request(options: HttpOption, params: SafeAny): Observable<HttpRes> {
		let domain = '';
		let route = options.route;
		const proxyCfg = new Map(Object.entries(this.interceptorsFuns.proxy()));
		if (proxyCfg.size > 0) {
			const cfg = Array.from(proxyCfg).filter(([prefix, cfg]) =>
				options.route.startsWith(prefix)
			)[0];
			const pathRewrite = cfg ? cfg[1].pathRewrite : false;
			domain = cfg ? cfg[1].target : '';

			if (pathRewrite) {
				route = route.replace(cfg[0], '');
			}
		}

		const url = isHttpLink(options.route)
			? options.route
			: domain
				? new URL(route, domain).href
				: options.route;

		switch (options.type) {
			case 'post':
				return this.post(url, params, options);
			case 'get':
				return this.get(url, params, options);
			case 'put':
				return this.put(url, params, options);
			case 'delete':
				return this.delete(url, params, options);
		}
	}

	private post(url: string, data: ReqParam, reqCfgOptions: HttpOption) {
		return _http.post(url, data, reqCfgOptions, {
			timeout: reqCfgOptions.timeout,
			headers: reqCfgOptions.headers
		});
	}

	private put(url: string, data: ReqParam, reqCfgOptions: HttpOption) {
		return _http.put(url, data, reqCfgOptions, {
			timeout: reqCfgOptions.timeout,
			headers: reqCfgOptions.headers
		});
	}

	private delete(url: string, data: ReqParam, reqCfgOptions: HttpOption) {
		return _http.delete(url, reqCfgOptions, {
			data,
			timeout: reqCfgOptions.timeout,
			headers: reqCfgOptions.headers
		});
	}

	private get(url: string, params: ReqParam, reqCfgOptions: HttpOption) {
		return _http.get(url, reqCfgOptions, {
			params,
			timeout: reqCfgOptions.timeout,
			headers: reqCfgOptions.headers
		});
	}

	private printParams(tag: string, params: SafeAny, options: HttpOption, color = 'green') {
		if (!options.isConsoleInvisible) {
			loggerSrv.log(`${tag}${options.route}`, params, color);
		}
	}
}

export const httpSrv = HttpService.getInstance();
