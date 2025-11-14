import { Handlers, HttpRequestConfig } from './http.type';

/** 默认处理函数 */
export const _handlers: Required<Handlers> = {
	config: config => config,
	headers: cfg => cfg,
	params: () => ({}),
	observable: (ob, config) => ob,
	intercept: config => false,
	error: (event, config) => {},
	proxy: () => ({}),
	codeKeys: () => ['errcode'],
	successCode: () => [0, 200]
};

/** 默认配置 */
export const _defConfig: Required<Pick<HttpRequestConfig, 'retryCount' | 'timeout'>> = {
	retryCount: 0,
	timeout: 10000
};
