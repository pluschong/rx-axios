# @pluschong/rx-axios

[![npm version](https://img.shields.io/npm/v/@pluschong/rx-axios.svg)](https://www.npmjs.com/package/@pluschong/rx-axios)
[![license](https://img.shields.io/npm/l/@pluschong/rx-axios.svg)](https://github.com/pluschong/rx-axios/blob/master/LICENSE)

基于 Axios 和 RxJS 封装的 HTTP 请求库，提供响应式编程风格的 API，支持请求拦截、错误处理、自动重试、代理配置等功能。

## ✨ 特性

- 🔄 **响应式编程**：基于 RxJS Observable，支持流式数据处理
- 🔁 **自动重试**：可配置重试次数和排除特定状态码
- ⏱️ **超时控制**：支持请求超时配置
- 🎯 **请求拦截**：灵活的请求拦截机制
- 🔌 **代理支持**：内置代理配置，支持路径重写
- 🎨 **自定义处理器**：支持自定义请求配置、请求头、参数、错误等处理逻辑
- 📦 **TypeScript**：完整的类型定义
- 🚫 **取消请求**：Observable 取消订阅时自动取消请求

## 📦 安装

```bash
npm install @pluschong/rx-axios rxjs
# or
pnpm add @pluschong/rx-axios rxjs
# or
yarn add @pluschong/rx-axios rxjs
```

## 🚀 快速开始

### 基本使用

```typescript
import { httpSrv } from '@pluschong/rx-axios';

// 发送 GET 请求
httpSrv.sendRequest({
  route: '/api/users',
  type: 'get'
}).subscribe({
  next: (response) => console.log(response),
  error: (error) => console.error(error)
});

// 发送 POST 请求
httpSrv.sendRequest({
  route: '/api/users',
  type: 'post'
}, {
  name: 'John Doe',
  email: 'john@example.com'
}).subscribe({
  next: (response) => console.log('User created:', response),
  error: (error) => console.error('Failed:', error)
});
```

### 配置处理器

```typescript
// 配置全局请求头
httpSrv.setHandlers.headers((headers) => {
  return {
    ...headers,
    'Authorization': `Bearer ${getToken()}`,
    'X-Custom-Header': 'value'
  };
});

// 配置全局参数
httpSrv.setHandlers.params(() => ({
  timestamp: Date.now(),
  version: '1.0.0'
}));

// 配置错误处理
httpSrv.setHandlers.error((error, config) => {
  console.error(`Request failed: ${config.route}`, error);
  // 可以在这里显示错误提示
});

// 配置请求拦截
httpSrv.setHandlers.intercept((config) => {
  // 返回 true 拦截请求，false 继续执行
  if (!isLoggedIn() && config.route.startsWith('/api/private')) {
    console.warn('User not logged in');
    return true;
  }
  return false;
});
```

### 代理配置

```typescript
httpSrv.setHandlers.proxy(() => ({
  '/api/v2': {
    target: 'https://api-v2.example.com',
    pathRewrite: true  // /api/v2/users -> /users
  },
  '/api': {
    target: 'https://api.example.com',
    pathRewrite: false  // /api/users -> /api/users
  }
}));
```

### 自定义错误码配置

```typescript
// 配置错误码字段名（支持多个字段，找到第一个匹配的）
httpSrv.setHandlers.codeKeys(() => ['errcode', 'code', 'status']);

// 配置成功状态码
httpSrv.setHandlers.successCode(() => [0, 200, 201]);
```

## 📖 API 文档

### HttpRequestConfig

请求配置对象：

```typescript
interface HttpRequestConfig {
  /** 请求路由 */
  route: string;
  /** 请求方法 */
  type: 'get' | 'post' | 'put' | 'delete';
  /** 请求头 */
  headers?: { [key: string]: string | number | boolean };
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 静默模式：不打印请求和响应日志 */
  silent?: boolean;
  /** 禁用错误提示 */
  disableErrorToast?: boolean;
  /** 权限标识符 */
  auth?: string | string[];
  /** 参数保持原样（不合并全局参数） */
  keepIntact?: boolean;
}
```

### SetHandlers

配置处理器方法：

| 方法 | 说明 | 类型 |
|------|------|------|
| `config` | 处理请求配置 | `(config: HttpRequestConfig) => HttpRequestConfig` |
| `headers` | 处理请求头 | `(headers: AxiosRequestHeaders) => AxiosRequestHeaders` |
| `params` | 添加全局参数 | `() => SafeObject` |
| `observable` | 处理 Observable | `(ob: Observable<HttpResponse>, config: HttpRequestConfig) => Observable<HttpResponse>` |
| `intercept` | 拦截请求 | `(config: HttpRequestConfig) => boolean` |
| `error` | 处理错误 | `(event: any, config: HttpRequestConfig) => void` |
| `proxy` | 配置代理 | `() => ProxyConfig` |
| `codeKeys` | 配置错误码字段 | `() => string[]` |
| `successCode` | 配置成功状态码 | `() => number[]` |

## 🔧 高级用法

### 请求重试

```typescript
httpSrv.sendRequest({
  route: '/api/data',
  type: 'get',
  retryCount: 3,  // 失败后重试 3 次
  timeout: 5000   // 5 秒超时
}).subscribe({
  next: (data) => console.log(data),
  error: (error) => console.error('Max retries exceeded', error)
});
```

**注意**：401 和 404 状态码默认不会重试。

### 取消请求

```typescript
const subscription = httpSrv.sendRequest({
  route: '/api/long-task',
  type: 'get'
}).subscribe({
  next: (data) => console.log(data)
});

// 取消请求
subscription.unsubscribe();
```

### RxJS 操作符链式调用

```typescript
import { map, filter, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

httpSrv.sendRequest({
  route: '/api/users',
  type: 'get'
}).pipe(
  map(response => response.data),
  filter(data => data.length > 0),
  catchError(error => {
    console.error('Error:', error);
    return of([]);  // 返回空数组作为默认值
  })
).subscribe(users => {
  console.log('Filtered users:', users);
});
```

### 自定义 Observable 处理

```typescript
import { tap, delay } from 'rxjs/operators';

httpSrv.setHandlers.observable((ob, config) => {
  return ob.pipe(
    tap(() => console.log(`Loading data from ${config.route}...`)),
    delay(100)  // 添加延迟
  );
});
```

## 🔍 默认配置

```typescript
// 默认重试配置
{
  retryCount: 0,      // 不重试
  timeout: 10000      // 10秒超时
}

// 默认错误码配置
{
  codeKeys: ['errcode'],
  successCode: [0, 200]
}
```

## 📝 注意事项

1. **代理配置顺序**：更具体的路径前缀应放在前面，避免被通用前缀拦截
2. **重试机制**：401 和 404 状态码不会触发重试
3. **流式响应**：`responseType: 'stream'` 时不会自动添加取消令牌
4. **全局参数**：设置 `keepIntact: true` 可跳过全局参数合并

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT © [pluschong](https://github.com/pluschong)
