# 运营助手客户台账记录

本文记录“小灰龙-运营助手”通过钉钉登记客户运营台账到飞书 Wiki 子文档的产品约定、当前能力、验证结论和后续演进。

## 1. 目标

让团队成员在钉钉里直接登记客户运营事实，不需要手动打开飞书客户项目台账查找位置、复制粘贴和补日期。

```text
钉钉 @小灰龙-运营助手 客户 时间 动作
钉钉 @小灰龙-运营助手 记台账：客户 时间 动作
  -> DingTalk Stream
  -> 本地/服务机 Node 进程
  -> JSONL 暂存
  -> 飞书 Wiki 客户项目台账 Docx
```

## 2. 当前范围

- 入口机器人：`小灰龙-运营助手`
- 当前开放群：`增长运营组`
- 当前权限策略：群白名单，群内所有成员可登记台账
- 飞书 Wiki 父节点：`002 运营 | 客户合作台账`
- 父节点 token：`ZUDGweCwji0KqLk7t00cGYzGn6b`
- Wiki space：`7542785291033051139`
- 客户文档标题模式：`001 京东金融｜项目台账`
- 写入表格：客户 Docx 内的运营台账表
- 写入列：`日期`、`内容`
- 图片位置：同一行 `内容` 单元格内，紧跟文字后面
- 消息确认：服务收到授权且非重复消息后，会先对原消息贴 `get` 表情；贴表情失败只记日志，不影响台账写入和文字回复。

暂不支持：

- 自动新建客户台账文档
- 纯图片消息登记
- 自动识别后续单独发送的图片属于哪条台账
- 写入复盘、下一步、行动、文档等更多结构化列

## 3. 使用方式

文本登记：

```text
@小灰龙-运营助手 京东金融 今天15:30 同步1503流量切回39.9元
@小灰龙-运营助手 记台账：京东金融 26日 订单可获取到手机号吗
```

图文登记：

```text
@小灰龙-运营助手 宜享花 今日 客户对我们的退费率提出了要求，下一步计划输出对应的分析文档
```

在同一条钉钉消息里附上图片。服务会把文字写入 `内容` 单元格，并把图片紧跟在文字后面。

建议：

- 一条消息只登记一个客户的一件运营事实。
- 推荐团队成员使用 `记台账：客户 日期 内容`，日期可写 `今天`、`今日`、`260626`、`6.26`、`6月26日`、`26日`。
- 客户名尽量使用飞书客户台账标题中的名称，例如 `京东金融`、`奇富数科`、`宜享花`。
- 图片必须和文字放在同一条消息里。
- 测试消息建议带唯一后缀，例如 `图片位置验证-0715`，便于肉眼和 API 回查。

## 4. 处理逻辑

1. DingTalk Stream 收到机器人消息。
2. `stream-adapter` 解析 `text` / `richText`，提取正文和图片附件元数据。
3. `intent-router` 判断是否为客户台账登记。
4. `bot-service` 对原消息调用钉钉 `POST /v1.0/robot/emotion/reply` 贴 `get` 表情。
5. `bot-service` 先写 JSONL pending，再同步飞书。
6. 客户匹配器从 Wiki 父节点子文档标题中提取客户名并匹配目标 Docx。
7. Docx writer 找到运营台账表，在表格末尾追加一行。
8. 图片处理：
   - 如果钉钉直接给 URL，直接写入 Docx `<img href="..."/>`。
   - 如果钉钉给 `downloadCode` / `pictureDownloadCode`，调用 `POST https://api.dingtalk.com/v1.0/robot/messageFiles/download` 换取临时 `downloadUrl`，再写入 Docx。
9. 成功后机器人回复“已记录到客户运营台账... / 图片N张”。

## 5. 可靠性约定

- 先 JSONL 暂存，再写飞书。
- 使用 DingTalk `messageId` 做幂等，避免重复投递造成重复写入。
- 客户无匹配或多匹配时不写飞书，改为暂存并提示。
- 飞书写入失败时保留 failed 记录，可用补偿脚本重放。
- 图片下载失败时保留 failed 记录，并提示重新发送图文登记。

关键文件：

- `src/stream-adapter.ts`：解析钉钉 `text` / `richText` 和图片元数据
- `src/dingtalk-media.ts`：用 `downloadCode` 换取钉钉临时图片 URL
- `src/dingtalk-reaction.ts`：调用钉钉机器人贴表情接口，对收到的消息贴 `get`
- `src/customer-ledger.ts`：客户匹配、JSONL store、Docx XML row writer
- `src/bot-service.ts`：台账意图分支、回复、失败处理
- `scripts/replay_customer_ledger.mjs`：失败记录补偿

## 6. 真实验证

验证日期：2026-06-26

验证环境：

- 当前电脑任务计划程序：`OpsAssistantCustomerLedger`
- 项目路径：`E:\Workspace_codex\project000`
- 运行入口：`scripts/start_intake.mjs`
- 机器人：`dingxuuuvqzncyx1o6wp`
- 目标文档：`005 宜享花｜项目台账`
- doc token：`WhEOdKEDdotX7VxPRckcFiQsnce`

验证通过项：

- 文本登记可新增飞书运营台账行。
- 钉钉富文本图片不再污染正文。
- `downloadCode` 可换取钉钉临时图片 URL。
- 图片可写入飞书 Docx。
- 图片可写入 `内容` 单元格并紧跟文字之后。
- 飞书 API 回读可看到新增行与 `<img>` 节点。

关键记录：

- `#CL-20260626-010`：图文登记成功，旧布局中图片位于最右侧 `文档` 列。
- `#CL-20260626-011`：图文登记成功，新布局中图片位于 `内容` 单元格，紧跟文字之后。
- `#CL-20260626-017`：群成员格式 `记台账：京东金融 26日 订单可获取到手机号吗` 补写成功，目标文档 `001 京东金融｜项目台账`，回读 revision `4588`。
- 飞书 revision：`951`。
- 测试命令：`D:\nodejs24\npm.cmd test`，结果 `122 pass / 0 fail`。

## 7. 运维与排障

当前权限配置：

```text
DINGTALK_ALLOWED_CONVERSATION_IDS=cidFAOgAztoZGdUmkfl60XKXA==
DINGTALK_ALLOWED_USER_IDS=
```

含义：仅 `增长运营组` 可用，群内不再限制具体成员。

健康检查：

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\windows\customer-ledger-health.ps1 `
  -ProjectRoot "E:\Workspace_codex\project000" `
  -LogDir "E:\Workspace_codex\project000\logs"
```

查看最近日志：

```powershell
Get-Content E:\Workspace_codex\project000\logs\ecocc-intake.out.log -Tail 120
```

回查飞书：

```powershell
lark-cli.cmd docs +fetch --doc WhEOdKEDdotX7VxPRckcFiQsnce --api-version v2 `
  --scope keyword --keyword "图片位置验证" --detail simple --doc-format xml --as user --format json
```

常见问题：

- 钉钉已发但日志无 `stream.robot.message.received`：检查机器人 AppKey/Bot ID 是否是 `dingxuuuvqzncyx1o6wp`，以及 Stream 是否连接成功。
- 日志有 `stream.robot.message.received` 但 `intentType=unknown`：通常是登记格式未被解析器支持；当前已支持 `记台账：客户 26日 内容`。
- 日志有 `imageAttachmentCount=1` 但 `imageUrlCount=0`：检查钉钉媒体下载接口是否失败，或下载码是否过期。
- 日志显示 `synced` 但页面看不到：刷新飞书页面，用唯一关键词搜索，或用 `docs +fetch` 回读确认。
- 旧测试行仍存在：历史测试残留不会自动清理，可人工删除或后续实现按 block id 清理。

## 8. 后续演进

- 将当前电脑任务计划程序迁移到固定办公室电脑/NSSM，再迁移到云服务器或容器。
- 增加团队白名单和审计视图。
- 增加 pending/failed 自动补偿任务。
- 增加客户候选确认交互。
- 增加旧测试行清理工具。
- 评估把图片长期转存到飞书 Drive，减少钉钉临时下载 URL 过期风险。
