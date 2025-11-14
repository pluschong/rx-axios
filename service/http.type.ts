import type { SafeAny, SafeObject } from '@pluschong/safe-type';
import type { AxiosRequestHeaders } from 'axios';
import type { Observable } from 'rxjs';

export interface HttpResponse {
	[key: string]: SafeAny;
	errcode: number;
	message?: string;
}

export interface HttpRequestConfig {
	/** 请求路由 */
	route: string;
	/** request method */
	type: 'get' | 'post' | 'put' | 'delete';
	/** 请求头 */
	headers?: { [key: string]: string | number | boolean };
	/** 超时时间 毫秒 */
	timeout?: number;
	/** 重试次数 */
	retryCount?: number;
	/** 静默模式：不打印请求和响应日志 */
	silent?: boolean;
	/** 禁用错误提示 */
	disableErrorToast?: boolean;
	/** 权限标识符 */
	auth?: string | string[];
	/** 参数保持原样 */
	keepIntact?: boolean;
}

export interface ProxyConfig {
	[prefix: string]: {
		target: string;
		pathRewrite?: boolean;
	};
}

export type ConfigHandler = (config: HttpRequestConfig) => HttpRequestConfig;
export type HeadersHandler = (headers: AxiosRequestHeaders) => AxiosRequestHeaders;
export type ParamsHandler = () => SafeObject;
export type ObservableHandler = (ob: Observable<HttpResponse>,config: HttpRequestConfig) => Observable<HttpResponse>; // prettier-ignore
export type InterceptHandler = (config: HttpRequestConfig) => boolean;
export type ErrorHandler = (event: SafeAny, config: HttpRequestConfig) => void;
export type ProxyHandler = () => ProxyConfig;
export type CodeKeysHandler = () => string[];
export type SuccessCodeHandler = () => number[];

export interface Handlers {
	/** 处理请求配置 */
	config: ConfigHandler;
	/** 处理请求头 */
	headers: HeadersHandler;
	/** 处理请求参数 */
	params: ParamsHandler;
	/** 处理请求可观察对象 */
	observable: ObservableHandler;
	/** 处理请求拦截 */
	intercept: InterceptHandler;
	/** 处理请求错误 */
	error: ErrorHandler;
	/** 配置请求代理 */
	proxy: ProxyHandler;
	/** 配置错误码key */
	codeKeys: CodeKeysHandler;
	/** 配置成功错误码 */
	successCode: SuccessCodeHandler;
}
export interface SetHandlers {
	/** 设置处理请求配置函数 */
	config: (fun: ConfigHandler) => SetHandlers;
	/** 设置处理请求头函数 */
	headers: (fun: HeadersHandler) => SetHandlers;
	/** 设置处理请求参数函数 */
	params: (fun: ParamsHandler) => SetHandlers;
	/** 设置处理请求可观察对象函数 */
	observable: (fun: ObservableHandler) => SetHandlers;
	/** 设置处理请求拦截函数 */
	intercept: (fun: InterceptHandler) => SetHandlers;
	/** 设置处理请求错误函数 */
	error: (fun: ErrorHandler) => SetHandlers;
	/** 设置处理请求代理函数 */
	proxy: (fun: ProxyHandler) => SetHandlers;
	/** 设置配置错误码key函数 */
	codeKeys: (fun: CodeKeysHandler) => SetHandlers;
	/** 设置配置成功错误码函数 */
	successCode: (fun: SuccessCodeHandler) => SetHandlers;
}
