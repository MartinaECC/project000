---
name: tencent-docs-openapi
description: 通过腾讯文档官方 OpenAPI 操作文档、表格、智能表和云盘资源。适用于生成 OAuth 授权链接、换取或刷新 token、调用 Drive/File API、写入在线表格、编辑文档、管理智能表、导入导出文件、检查 scope、诊断权限或频控问题。不要使用浏览器自动化代替 OpenAPI。
---

# 腾讯文档 OpenAPI

只通过腾讯文档官方 OpenAPI 操作资源，不自动化网页编辑器读写内容。

## 必要输入

发起真实调用前，先向用户确认这些信息：

- `client_id`：来自腾讯文档开放平台应用配置。
- `client_secret`：只应在服务端或环境变量中使用，不写入源码、日志或截图。
- `redirect_uri`：应用白名单中的 HTTPS 回调地址。
- 一次性 OAuth `code`、已有 `refresh_token`，或允许生成授权 URL 让用户打开授权。
- 操作既有文件时，需要目标 `fileID` 或文档 URL。

无人值守、应用自有文档优先使用应用账号 token 流程，但应用需具备 `scope.auth.account`。用户自有文档使用 OAuth 授权码流程。

## 鉴权流程

1. 生成授权 URL：
   `https://docs.qq.com/oauth/v2/authorize?client_id=CLIENT_ID&redirect_uri=URL_ENCODED_REDIRECT_URI&response_type=code&scope=all&state=STATE`
2. 用户完成授权，浏览器会携带 `code` 和 `state` 跳转到 `redirect_uri`。
3. 用一次性 `code` 换取 `access_token`、`refresh_token` 和 `user_id`：
   `GET https://docs.qq.com/oauth/v2/token?...&grant_type=authorization_code&code=CODE`
4. token 必须保存在仓库外。`access_token` 有效期短，`refresh_token` 有效期更长且敏感。
5. 每次 OpenAPI 请求携带请求头：
   - `Access-Token: ACCESS_TOKEN`
   - `Client-Id: CLIENT_ID`
   - `Open-Id: USER_ID`

端点、scope 和频控信息见 `references/openapi-map.md`。

## 本地辅助脚本

使用 `scripts/tencent_docs_openapi.py` 统一处理授权和请求。

示例：

```bash
python scripts/tencent_docs_openapi.py auth-url --client-id CLIENT_ID --redirect-uri https://example.com/callback --state STATE
python scripts/tencent_docs_openapi.py exchange-code --client-id CLIENT_ID --client-secret CLIENT_SECRET --redirect-uri https://example.com/callback --code CODE
python scripts/tencent_docs_openapi.py refresh --client-id CLIENT_ID --client-secret CLIENT_SECRET --refresh-token REFRESH_TOKEN
python scripts/tencent_docs_openapi.py app-token --client-id CLIENT_ID --client-secret CLIENT_SECRET
python scripts/tencent_docs_openapi.py request --method GET --path /openapi/drive/v2/files/FILE_ID/metadata --client-id CLIENT_ID --open-id OPEN_ID --access-token ACCESS_TOKEN
```

优先用环境变量传递密钥：

```bash
set TENCENT_DOCS_CLIENT_ID=...
set TENCENT_DOCS_CLIENT_SECRET=...
set TENCENT_DOCS_ACCESS_TOKEN=...
set TENCENT_DOCS_OPEN_ID=...
```

## 常见工作流

- 创建文档、表格或智能表：调用 `POST /openapi/drive/v2/files`，传入 `title` 和 `type`。
- 批量写入表格：先创建或定位表格文件，再用 sheet range API 清空或更新范围；整表替换可考虑 Drive 导入接口。
- 管理权限：文件创建后使用 Drive 权限和协作者接口。
- 编辑富文本文档：先用 `GET /openapi/doc/v3/{fileId}` 读取，再用 `POST /openapi/doc/v3/{fileId}:batchUpdate` 更新。
- 操作智能表：使用 smartsheet 的表、视图、记录和字段接口。

## 安全要求

- 不询问腾讯文档账号密码；只使用 OAuth 或应用账号 token。
- 不把 `client_secret`、`access_token`、`refresh_token` 写入 skill、仓库、截图或日志。
- OpenAPI 调用应在后端或服务端上下文执行。
- 如果开放平台应用的 scope 发生变化，用户需要重新授权才能获得包含新 scope 的 token。
