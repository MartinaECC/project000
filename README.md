# project000

Skill 管理总览：[docs/skills/README.md](docs/skills/README.md)

`project000` 是一个面向团队工作的 AI 助手项目。当前阶段先沉淀可复用的工作流、自动化脚本和协作流程，再逐步从真实岗位和高频低风险任务中孵化具体助手。

## 当前包含的能力

- **钉钉智能机器人底座**：支持 DingTalk Stream 模式接入、消息解析、白名单、幂等处理、LLM 对话和回复。
- **客户运营台账记录**：支持在钉钉 `@小灰龙 客户 时间 动作` 或 `@小灰龙 记台账：客户 时间 动作`，匹配飞书 Wiki 下的客户台账子文档并追加运营记录；支持同条图文消息，图片写入 `内容` 单元格，见 [运营助手客户台账记录](docs/products/customer-ledger-dingtalk-feishu.md)。
- **群聊总结助手雏形**：识别“总结今天群聊”“总结本周群消息”等意图，通过 DWS 读取群消息并交给 LLM 总结。
- **退款率报告能力**：从 DataFinder 查询收入和退款数据，生成退款率报告，并在异常时调用 LLM 做摘要。
- **钉钉图表播报能力**：通过互动卡片发送 Markdown 或图片表格报表，当前样板见 [钉钉图表播报产品文档](docs/products/dingtalk-chart-broadcast.md)。
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
docs/products/               # 面向产品和运营协作的能力说明文档
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

客户运营台账写入使用飞书 Wiki 子文档：

```powershell
$env:CUSTOMER_LEDGER_ENABLED="true"
$env:CUSTOMER_LEDGER_WIKI_PARENT_NODE_TOKEN="ZUDGweCwji0KqLk7t00cGYzGn6b"
$env:CUSTOMER_LEDGER_SPACE_ID="7542785291033051139"
$env:CUSTOMER_LEDGER_STORAGE_DIR="E:\KnowledgeBase\00-Inbox\DingTalkCustomerLedger"
$env:CUSTOMER_LEDGER_DATE_FORMAT="yyMMdd"
```

输入示例：

```text
京东金融 今天15:30 同步1503流量切回39.9元
@小灰龙-运营助手 记台账：京东金融 26日 订单可获取到手机号吗
```

机器人会匹配父节点下类似 `001 京东金融｜项目台账` 的客户文档，并向“运营台账”表追加一行。

图文登记示例：

```text
@小灰龙-运营助手 宜享花 今日 客户对我们的退费率提出了要求，下一步计划输出对应的分析文档
```

图片需和文字放在同一条钉钉消息中。当前验证通过版本会将图片写入同一行 `内容` 单元格，紧跟文字之后。

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
D:\nodejs24\npm.cmd run start:intake
D:\nodejs24\npm.cmd run customer-ledger:replay:dry-run
D:\nodejs24\npm.cmd run refund-report:once
```

启动后，如果 `DINGTALK_MODE=stream`，服务会主动通过 DingTalk Stream 长连接接收机器人消息，不需要公网 HTTPS 回调。

退费率播报上云时，优先使用青龙任务调用 `scripts/ql_refund_report.sh`，不要在青龙里启动常驻 Stream 服务；详细步骤见 [钉钉图表播报产品文档](docs/products/dingtalk-chart-broadcast.md)。

客户运营台账团队试点建议部署为固定办公室电脑 Windows 常驻服务，见 [Windows 常驻服务部署](docs/operations/customer-ledger-windows-service.md)。产品约定和验证记录见 [运营助手客户台账记录](docs/products/customer-ledger-dingtalk-feishu.md)。部署模板在 `deploy/windows/.env.intake.service.example`，健康检查和补偿脚本在 `scripts/windows/`。

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
