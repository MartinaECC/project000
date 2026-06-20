# 腾讯文档 OpenAPI 映射

资料核对日期：2026-06-19。

参考文档：

- 概览：https://docs.qq.com/open/document/app/
- 快速开始：https://docs.qq.com/open/document/app/get_started.html
- OAuth：https://docs.qq.com/open/document/app/oauth2/
- 授权：https://docs.qq.com/open/document/app/oauth2/authorize.html
- Access token：https://docs.qq.com/open/document/app/oauth2/access_token.html
- Refresh token：https://docs.qq.com/open/document/app/oauth2/refresh_token.html
- 应用账号 token：https://docs.qq.com/open/document/app/oauth2/app_account_token.html
- Drive/File API：https://docs.qq.com/open/document/app/openapi/v2/file/
- Sheet API：https://docs.qq.com/open/document/app/openapi/v2/sheet/
- Doc API：https://docs.qq.com/open/document/app/openapi/v3/doc/
- Smartsheet API：https://docs.qq.com/open/document/app/openapi/v2/smartsheet/
- Form API：https://docs.qq.com/open/document/app/openapi/v2/form/
- 频控：https://docs.qq.com/open/document/app/openapi/v2/frequency_control.html
- Scope：https://docs.qq.com/open/document/app/scope.html

## 访问模型

腾讯文档使用 OAuth2 授权码流程访问用户资源。应用收到 `code` 后换取 `access_token`、`refresh_token`、`scope` 和 `user_id`（`Open ID`），调用 OpenAPI 时携带 `Client-Id`、`Open-Id` 和 `Access-Token` 请求头。

官方文档没有用户名/密码登录流程，不要请求或使用账号密码。

另有应用账号 token 接口：

- `GET /oauth/v2/app-account-token`
- 需要 `scope.auth.account`。
- 适合应用自有、无人值守的自动化文档。
- 应用账号不能登录腾讯文档前端。
- 文档说明应用账号文档不能被游客匿名访问。
- 文档说明应用账号免费存储空间为 1 GB，且不可扩容。

## OAuth 端点

基础域名：`https://docs.qq.com`

授权：

- `GET /oauth/v2/authorize`
- 参数：`client_id`、`redirect_uri`（HTTPS、URL 编码、在白名单中）、`response_type=code`、`scope=all`、可选 `state`。
- 浏览器授权可能展示二维码页；微信流程可能直接进入确认。
- 回调返回 `code` 和 `state`。

授权码换 token：

- `GET /oauth/v2/token`
- 参数：`client_id`、`client_secret`、`redirect_uri`、`grant_type=authorization_code`、`code`。
- `redirect_uri` 必须和授权请求一致。
- `code` 一次性且短期有效。不同文档页面描述存在 5 分钟和 10 分钟差异，按短期有效处理，拿到后立即换取。

刷新 token：

- `GET /oauth/v2/token`
- 参数：`client_id`、`client_secret`、`grant_type=refresh_token`、`refresh_token`。

用户信息：

- `GET /oauth/v2/userinfo?access_token=...`
- 需要 `scope.user.info.base`。
- 返回 `openID`、昵称、头像、来源、`unionID`。

## 请求头

OpenAPI 请求需要：

- `Access-Token`
- `Client-Id`
- `Open-Id`

官方文档要求 OpenAPI 调用从后端服务发起。

## 能力地图

### Drive / 文件管理

接口前缀：`/openapi/drive/v2/...`

文件操作：

- 创建文件：`POST /openapi/drive/v2/files`
- 元数据：`GET /openapi/drive/v2/files/{fileID}/metadata`
- 重命名：`PATCH /openapi/drive/v2/files/{fileID}`
- 移动：`PATCH /openapi/drive/v2/files/{fileID}/move`
- 删除：`DELETE /openapi/drive/v2/files/{fileID}`
- 复制：`POST /openapi/drive/v2/files/{fileID}/copy`
- 星标：`PATCH /openapi/drive/v2/files/{fileID}/star`
- 置顶：`PATCH /openapi/drive/v2/files/{fileID}/pin`
- 水印：`PATCH /openapi/drive/v2/files/{fileID}/watermark`
- 快捷方式：`POST /openapi/drive/v2/files/{fileID}/shortcut`
- 恢复：`PATCH /openapi/drive/v2/files/{fileID}/recover`

导入导出：

- 获取上传 URL：`POST /openapi/drive/v2/files/upload-url`
- 异步导入：`POST /openapi/drive/v2/files/async-import`
- 导入进度：`GET /openapi/drive/v2/files/import-progress`
- 异步导出：`POST /openapi/drive/v2/files/{fileID}/async-export`
- 导出进度：`GET /openapi/drive/v2/files/{fileID}/export-progress`

文件夹：

- 列出文件夹：`GET /openapi/drive/v2/folders/{folderID}`
- 文件夹元数据：`GET /openapi/drive/v2/folders/{folderID}/metadata`
- 创建文件夹：`POST /openapi/drive/v2/folders`
- 删除文件夹：`DELETE /openapi/drive/v2/folders/{folderID}`
- 文件夹权限：`GET /openapi/drive/v2/folders/{folderID}/permission`
- 移动文件夹：`POST /openapi/drive/v2/folders/{folderID}/move`
- 重命名文件夹：`PATCH /openapi/drive/v2/folders/{folderID}`

权限和协作：

- 查询用户访问权限：`GET /openapi/drive/v2/files/{fileID}/access`
- 转移所有者：`PATCH /openapi/drive/v2/files/{fileID}/ownership`
- 查看权限：`GET /openapi/drive/v2/files/{fileID}/permission`
- 设置权限：`PATCH /openapi/drive/v2/files/{fileID}/permission`
- 申请权限：`POST /openapi/drive/v2/files/{fileID}/permission/apply`
- 添加协作者：`PATCH /openapi/drive/v2/files/{fileID}/collaborators`
- 删除协作者：`DELETE /openapi/drive/v2/files/{fileID}/collaborators`
- 列出协作者：`GET /openapi/drive/v2/files/{fileID}/collaborators`

搜索和工具：

- 筛选列表：`GET /openapi/drive/v2/filter`
- 关键词搜索：`GET /openapi/drive/v2/search`
- fileID 转换：`GET /openapi/drive/v2/util/converter`
- 上传图片：`POST /openapi/resources/v2/images`
- 资源用量：`GET /openapi/drive/v2/util/resource-use`
- 未读通知数：`GET /openapi/drive/v2/notification/unread-count`

### 在线表格

文档导航标注 V3 为推荐版本，但本次核对到的索引页仍展示 V2 端点，并标注 V2 已废弃。生产构建前需要再次确认当前 Sheet V3 端点。

V2 端点示例：

- 查询工作表：`GET /openapi/sheetbook/v2/{bookID}/sheets-info`
- 新增工作表：`POST /openapi/sheetbook/v2/{bookID}:batchUpdate`
- 删除行列：`POST /openapi/sheetbook/v2/{bookID}:batchUpdate`
- 清空范围：`POST /openapi/sheetbook/v2/{bookID}/values/{range}:clear`
- 更新范围：`PUT /openapi/sheetbook/v2/{bookID}/values/{range}`
- 批量插入图片：`POST /openapi/sheetbook/v2/{bookID}:batchUpdate`

结构化写入优先使用范围 API。大表全量刷新可考虑生成 XLSX 后走 Drive 导入或替换流程，具体以目标端点文档为准。

### 在线文档

V3 端点：

- 获取文档内容：`GET /openapi/doc/v3/{fileId}`
- 批量更新文档内容：`POST /openapi/doc/v3/{fileId}:batchUpdate`

富文本文档读写应使用这些接口，不要自动化网页编辑器。

### 智能表

智能表资源包括表、视图、记录和字段。

- 新增、删除、查询表：`/openapi/smartbook/v2/files/{fileID}/sheets`
- 新增、删除、查询视图：`/openapi/smartbook/v2/files/{fileID}/sheets/{sheetID}`
- 新增、删除、查询、更新记录：`/openapi/smartbook/v2/files/{fileID}/sheets/{sheetID}`
- 新增、删除、查询、更新字段：`/openapi/smartbook/v2/files/{fileID}/sheets/{sheetID}`

索引页中多数智能表操作使用 `POST`，构造请求体前需要查看具体端点详情。

### 表单

- 更新收集截止时间：`PUT /openapi/drive/v2/forms/{formID}/release`
- 生成收集结果：`POST /openapi/drive/v2/forms/{formID}/result`

## 权限和 Scope

腾讯文档 OpenAPI 权限分为免审核和需审核两类。默认应用具备免审核权限，高风险权限需要在开放平台控制台选择并审核。

应用权限变化后，用户需要重新授权，才能获得包含新 scope 的 token。

文档示例中出现的 scope 包括：

- `scope.auth.account`
- `scope.user.info.base`
- `scope.file.creatable`、`scope.file.deletable`、`scope.file.modifiable`、`scope.file.queryable`
- `scope.folder.creatable`、`scope.folder.deletable`、`scope.folder.modifiable`、`scope.folder.queryable`
- `scope.sheet.editable`、`scope.sheet.readonly`
- `scope.doc.editable`、`scope.doc.readonly`
- `scope.smartsheet.editable`、`scope.smartsheet.readonly`
- `scope.drive.form`
- `scope.drive.group`
- `scope.drive.presentation`
- `scope.attachment.queryable`

## 频控

文档中的默认约定：

- 文件操作：按 `openID` 300 次/分钟，除非端点另有说明。
- 导入 API：按 `openID` 60 次/分钟。
- 导出 API：9 次/天。
- 单文档内容操作：按 `fileID` 150 次/分钟。

实现时需要重试、退避和幂等。避免逐单元格写入，优先批量范围或批量记录。

## 实用接入清单

1. 确认应用已通过腾讯文档开放平台审核。
2. 确认 `redirect_uri` 是 HTTPS，且在应用白名单中。
3. 确认所需 scope 已选择并通过审核。
4. 生成授权 URL，并让用户完成授权。
5. 立即用 `code` 换 token。
6. 将 `refresh_token` 保存到密钥存储中。
7. 调用 `/oauth/v2/userinfo` 或低风险元数据端点验证 token 和 `Open ID`。
8. 创建或定位目标文件。
9. 通过 sheet、doc、smartsheet 或 drive 端点写入。
10. 通过 OpenAPI 回读元数据或内容完成验证。
