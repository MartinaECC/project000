# project000

`project000` 是一个面向团队工作的 AI 助手项目。当前阶段先沉淀可复用的工作流、自动化脚本和协作流程，再逐步从真实岗位和高频低风险任务中孵化具体助手。

## 当前包含的能力

- **钉钉智能机器人底座**：支持 DingTalk Stream 模式接入、消息解析、白名单、幂等处理、LLM 对话和回复。
- **群聊总结助手雏形**：识别“总结今天群聊”“总结本周群消息”等意图，通过 DWS 读取群消息并交给 LLM 总结。
- **退款率报告能力**：从 DataFinder 查询收入和退款数据，生成退款率报告，并在异常时调用 LLM 做摘要。
- **月度客户复盘能力**：按自然月生成收入、退款、续费、加购、投诉等指标的复盘草稿。
- **腾讯文档 OpenAPI skill**：通过官方 OpenAPI 处理授权、文件、表格、文档和智能表相关操作。
- **协作文档体系**：记录岗位任务、助手路线图、协作流程、成果台账、周/月复盘。

## 目录说明

```text
src/                         # 钉钉机器人和核心业务逻辑
test/                        # Node.js 自动化测试
scripts/                     # DataFinder、月度复盘、PDF 抽取等自动化脚本
skills/                      # 可复用 Codex skill
docs/                        # 项目说明、路线图、协作记录
ai-monthly-review-site/      # AI 月度复盘展示页
```

## 配置

复制 `.env.example` 为 `.env`，再按需填入本地配置。不要把 `.env` 或真实密钥提交到仓库。

常用配置项：

```powershell
$env:DINGTALK_MODE="stream"
$env:DINGTALK_CLIENT_ID="企业内部应用 AppKey / ClientID"
$env:DINGTALK_CLIENT_SECRET="企业内部应用 AppSecret / ClientSecret"
$env:DINGTALK_BOT_ID="机器人 robot-code"
$env:DINGTALK_ALLOWED_CONVERSATION_IDS="允许使用机器人的会话 ID，可留空"
$env:DINGTALK_ALLOWED_USER_IDS="允许使用机器人的用户 ID，可留空"
$env:LLM_API_KEY="模型 API Key"
$env:LLM_BASE_URL="https://api.openai.com/v1"
$env:LLM_MODEL="模型名称"
$env:DWS_BIN="dws"
$env:PORT="3000"
```

DataFinder 脚本使用：

```powershell
$env:DATAFINDER_APP_ID="DataFinder 应用 ID"
$env:DATAFINDER_ACCESS_KEY="DataFinder Access Key"
$env:DATAFINDER_SECRET_KEY="DataFinder Secret Key"
```

## 启动和测试

```powershell
D:\nodejs24\npm.cmd test
D:\nodejs24\npm.cmd start
```

启动后，如果 `DINGTALK_MODE=stream`，服务会主动通过 DingTalk Stream 长连接接收机器人消息，不需要公网 HTTPS 回调。

## 本地事件调试

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:3000/dingtalk/events `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"messageId":"local-1","conversationId":"test-group","senderId":"user-1","text":"你好"}'
```

## 安全约定

- 不提交 `.env`、真实 token、密钥、二维码、临时文件和原始业务数据。
- 对外或高风险动作必须保留人工确认点。
- 项目说明文档默认使用中文；代码标识符、命令名、路径名和 API 名保持英文。
