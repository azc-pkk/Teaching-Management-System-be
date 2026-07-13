# 统一 API 响应规范

后端所有接口由全局拦截器和异常过滤器统一包装。业务模块的 Service 只返回业务数据，不要重复编写 `success`、`data` 或 `error`。

## TypeScript 类型

```ts
export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  error: null;
};

export type ApiErrorResponse = {
  success: false;
  data: null;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PageResult<T> = {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
};
```

## 成功响应

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "示例数据"
  },
  "error": null
}
```

分页接口的 `data` 为：

```json
{
  "list": [],
  "page": 1,
  "pageSize": 10,
  "total": 0
}
```

## 失败响应

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "BAD_REQUEST",
    "message": "请求参数校验失败",
    "details": ["page must not be less than 1"]
  }
}
```

`details` 是可选字段。前端应优先展示 `error.message`，调试或表单逐项提示时再读取 `error.details`。

## 常用错误码

| HTTP 状态码 | error.code | 含义 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | 请求参数错误 |
| 401 | `UNAUTHORIZED` | 未登录或账号密码错误 |
| 403 | `FORBIDDEN` | 没有访问权限 |
| 404 | `NOT_FOUND` | 数据或接口不存在 |
| 409 | `CONFLICT` | 数据冲突或重复 |
| 422 | `UNPROCESSABLE_ENTITY` | 请求可识别但无法处理 |
| 429 | `TOO_MANY_REQUESTS` | 请求过于频繁 |
| 500 | `INTERNAL_SERVER_ERROR` | 服务器内部错误 |

## 新模块开发要求

Service 直接返回业务数据：

```ts
return {
  list,
  page,
  pageSize,
  total,
};
```

不要在 Controller 或 Service 中再次包装：

```ts
// 不要这样写，否则会形成 data.data
return {
  success: true,
  data: result,
};
```

## Apifox 同步

重新导入对应 OpenAPI 文件，并选择更新已有接口：

- 登录注册：`docs/apifox-auth.openapi.json`
- 教师学生：`docs/apifox-teacher-student.openapi.json`
- 教室管理：`docs/apifox-classrooms.openapi.json`

接口地址、请求参数和业务数据字段没有变化，只更新了统一响应结构。
