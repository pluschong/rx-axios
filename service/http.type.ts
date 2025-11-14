import type { SafeAny, SafeObject } from '@pluschong/safe-type';
import type { AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse } from 'axios';
import type { Observable } from 'rxjs';

export type HttpResponseBase = AxiosResponse;

export type HttpOptions = AxiosRequestConfig;

/** Response */
export interface HttpRes {
	[key: string]: SafeAny;
	success: boolean;
	errcode: SafeAny;
	message: SafeAny;
}

export type HttpParams = SafeAny;

export interface HttpOption {
	/** 请求路由 */
	route: string;
	/** request method */
	type: 'get' | 'post' | 'put' | 'delete';
	/** 请求头 */
	headers?: { [key: string]: string | number | boolean };
	/** 超时时间 毫秒 */
	timeout?: number;
	/** 重试次数 */
	retry?: number;
	/** 静默模式：不打印请求和响应日志 */
	silent?: boolean;
	/** 禁用错误提示 */
	disableErrorToast?: boolean;
	/** 权限标识符 */
	auth?: string | string[];
	/** 参数保持原样 */
	keepIntact?: boolean;
}

export type ReqParam = SafeAny;

export interface RspParam {
	[key: string]: SafeAny;
	data?: SafeAny;
}

export interface ProxyConfig {
	[prefix: string]: {
		target: string;
		pathRewrite?: boolean;
	};
}

export type UseProxyCfg = () => ProxyConfig;
export type UseReqHeaders = (config: AxiosRequestConfig<SafeAny>) => AxiosRequestHeaders;
export type UseReqDefOption = (op: HttpOption) => HttpOption;
export type UseReqDefParam = (op: HttpOption) => SafeObject;
export type UseRspErrMsg = (value: RspParam, op: HttpOption) => void;
export type UseIntercept = (op: HttpOption, ob: Observable<RspParam>) => Observable<RspParam>;
export type UseSendBefore = (op: HttpOption) => boolean;

export interface Interceptors {
	/** 请求代理 */
	proxy: (fun: UseProxyCfg) => void;
	/** 头代理 */
	headers: (fun: UseReqHeaders) => void;
	/** 默认配置 */
	options: (fun: UseReqDefOption) => void;
	/** 默认参数 */
	request: (fun: UseReqDefParam) => void;
	/** 错误代理 */
	response: (fun: UseRspErrMsg) => void;
	/** 拦截 */
	intercept: (fun: UseIntercept) => void;
	/** 发送请求之前 */
	sendBefore: (fun: UseSendBefore) => void;
}
