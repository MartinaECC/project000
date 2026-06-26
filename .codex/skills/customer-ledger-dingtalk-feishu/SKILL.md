---
name: customer-ledger-dingtalk-feishu
description: Build, debug, and operate the DingTalk-to-Feishu customer ledger workflow. Use when Codex needs to handle messages like "@小灰龙 客户 时间 动作", write customer operations records into Feishu/Lark Wiki Docx ledgers, diagnose DingTalk Stream delivery, fix lark-cli Docx writes, replay JSONL pending records, or plan stable deployment for the operations assistant.
---

# Customer Ledger DingTalk Feishu

## Overview

Use this skill for the "运营助手客户台账" workflow: DingTalk robot receives `客户 时间 动作`, parses the customer and date, appends a row to the matching Feishu Wiki customer Docx, and replies in DingTalk.

This skill is for implementation, production debugging, replay, and roadmap work around that workflow. For generic DingTalk app setup also use `dingtalk-app-dev`; for generic Feishu Docx/Wiki operations also use the relevant `lark-*` skills.

## Current MVP Contract

- DingTalk entry: `@小灰龙-运营助手 客户 时间 动作`
- Team command entry: `@小灰龙-运营助手 记台账：客户 时间 动作`
- Example: `京东金融 今天15:30 测试记录：小灰龙真实联调2`
- Team example: `记台账：京东金融 26日 订单可获取到手机号吗`
- Supported date words/forms: `今天` / `今日` / `昨天` / `明天` / `yyMMdd` / `M.d` / `M月d日` / `d日`
- Feishu Wiki parent node: `ZUDGweCwji0KqLk7t00cGYzGn6b`
- Feishu Wiki space: `7542785291033051139`
- Customer doc title pattern: `001 京东金融｜项目台账`
- Target table: customer Docx table with headers `日期 / 内容 / 行动 / 复盘 / 下一步 / 文档`
- MVP write behavior: append `日期=yyMMdd`, `内容=动作`; leave other cells empty
- Rich text/image behavior: a single DingTalk richText message may include `客户 时间 动作` plus image attachments. Keep the text action in `内容`, resolve image URLs, and append images in the same `内容` cell after the text as Docx `<img href="..."/>` nodes.
- Image source handling: if DingTalk exposes a direct image URL, use it. If it exposes `downloadCode` / `pictureDownloadCode`, call DingTalk `POST https://api.dingtalk.com/v1.0/robot/messageFiles/download` with `robotCode` to obtain `downloadUrl`, then write that URL into Feishu Docx.
- Image limitation: pure image-only messages do not contain customer/date/action and are not ledger records. If the DingTalk download code is expired or the API fails, save the JSONL pending row, mark it failed, and ask the user to resend the image with the ledger text.
- Reliability: save pending JSONL first, write Feishu second, use DingTalk `messageId` for idempotency

## Repo Touchpoints

In `E:\Workspace_codex\project000`:

- `src/customer-ledger.ts`: parser, customer wiki matcher, JSONL store, Docx XML row writer, lark-cli wrapper
- `src/intent-router.ts`: detects customer-ledger messages before generic chat
- `src/stream-adapter.ts`: parses DingTalk `text` and `richText`, including image attachment URL/media metadata
- `src/dingtalk-media.ts`: exchanges DingTalk robot image `downloadCode` for a temporary `downloadUrl`
- `src/bot-service.ts`: customer ledger intent branch, pending/synced/failed replies, passes image URLs to the writer
- `src/config.ts` and `.env.intake.local`: runtime config
- `scripts/start_intake.mjs`: long-running DingTalk Stream entry
- `test/customer-ledger.test.ts` and `test/bot-service.test.ts`: focused validation

Runtime data:

- Pending/synced/failed JSONL: `E:\KnowledgeBase\00-Inbox\DingTalkCustomerLedger\customer-ledger-YYYY-MM.jsonl`
- Runtime logs: `E:\Workspace_codex\project000\logs\ecocc-intake.out.log` and `.err.log`

Durable docs:

- Product/PRD and validation notes: `docs/products/customer-ledger-dingtalk-feishu.md`
- Windows service deployment/runbook: `docs/operations/customer-ledger-windows-service.md`
- MVP incident review: `.codex/skills/customer-ledger-dingtalk-feishu/references/incident-2026-06-26.md`

## Configuration Checklist

Required customer ledger vars:

```text
CUSTOMER_LEDGER_ENABLED=true
CUSTOMER_LEDGER_STORAGE_DIR=E:\KnowledgeBase\00-Inbox\DingTalkCustomerLedger
CUSTOMER_LEDGER_APP_ROLE=customer_ledger
CUSTOMER_LEDGER_WIKI_PARENT_NODE_TOKEN=ZUDGweCwji0KqLk7t00cGYzGn6b
CUSTOMER_LEDGER_SPACE_ID=7542785291033051139
CUSTOMER_LEDGER_DATE_FORMAT=yyMMdd
```

DingTalk robot vars must match the robot actually mentioned in the group. For the MVP incident, the real `小灰龙-运营助手` robot code was `dingxuuuvqzncyx1o6wp`; the old `.env.intake.local` still used `ding3cv0e5gguron10zy`, which caused all real messages to miss the backend.

Never print or commit `DINGTALK_CLIENT_SECRET`, LLM keys, Feishu tokens, or other secrets. Redact them in summaries.

## Debug Workflow

1. Confirm service is running:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match 'start_intake|src/index.ts --env-file \.env\.intake\.local' } |
  Select-Object ProcessId,CommandLine
```

2. Confirm Stream connected to the expected robot:

```powershell
Get-Content logs\ecocc-intake.out.log -Tail 80
```

Look for:

- `customerLedger.enabled=true`
- `stream.client.connecting clientId=...`
- `connect success`
- `stream.robot.message.received`

3. If DingTalk shows a sent message but logs do not change:

- Check that `.env.intake.local` uses the same `DINGTALK_CLIENT_ID` / `DINGTALK_BOT_ID` as the mentioned robot.
- Use `dws chat bot find --keyword "小灰龙" --format json` to identify the actual robot code.
- Confirm the Stream connection is established to that robot code.
- If config is correct but no message arrives, inspect DingTalk Open Platform robot ability, Stream receive mode, and publish status.

4. If text is recorded but images are missing:

- Inspect `stream.robot.message.received` and `customer_ledger.capture.pending_saved` in `logs\ecocc-intake.out.log`.
- `imageAttachmentCount > 0` means DingTalk delivered image metadata.
- `imageUrlCount > 0` means the service resolved usable image URLs and attempted to write them into Feishu Docx.
- If logs contain `customer_ledger.image.resolve_failed`, the DingTalk media API did not return a usable `downloadUrl`; expired `downloadCode` values require the user to resend the image.
- Keep the registration as one message: `@小灰龙-运营助手 客户 今天 动作` plus attached images. A follow-up image-only message cannot be matched to a customer ledger row yet.

5. If the bot replies "已暂存，但同步飞书失败":

- Inspect `customer_ledger.capture.failed` in `logs\ecocc-intake.out.log`.
- Inspect the JSONL record in `E:\KnowledgeBase\00-Inbox\DingTalkCustomerLedger`.
- If the error is `spawn EINVAL`, the Windows lark-cli wrapper is broken. Use the repo's `runCli` wrapper behavior: `.cmd/.bat` commands must go through `cmd.exe /d /c`.
- Validate lark-cli separately:

```powershell
lark-cli.cmd --version
lark-cli.cmd wiki +node-list --space-id 7542785291033051139 --parent-node-token ZUDGweCwji0KqLk7t00cGYzGn6b --page-size 2 --as user --format json
```

6. Confirm Feishu write:

```powershell
lark-cli.cmd docs +fetch --doc D7JUdOt7ooxdlZxhWFecPF1cnHd --api-version v2 --scope keyword --keyword "小灰龙真实联调2" --detail simple --doc-format xml --as user --format json
```

## Replay Pending Records

For a failed but valid JSONL record, replay through `LarkCliCustomerLedgerWriter`, then append `synced` to the store. Use the exact customer/date/action from the pending row, not the blank failed status row.

Example pattern:

```powershell
D:\nodejs24\node.exe --input-type=module -e 'import { LarkCliCustomerLedgerWriter, JsonlCustomerLedgerStore } from "./src/customer-ledger.ts"; const writer = new LarkCliCustomerLedgerWriter({ spaceId: "7542785291033051139", parentNodeToken: "ZUDGweCwji0KqLk7t00cGYzGn6b" }); const result = await writer.write({ customerName: "京东金融", ledgerDate: "260626", action: "测试记录：小灰龙真实联调2" }); console.log(JSON.stringify(result)); const store = new JsonlCustomerLedgerStore("E:/KnowledgeBase/00-Inbox/DingTalkCustomerLedger", "customer_ledger"); await store.markSynced("#CL-20260626-002", result);'
```

## Validation

Run tests after code changes:

```powershell
D:\nodejs24\npm.cmd test
```

For live validation:

1. Start or restart `D:\nodejs24\node.exe scripts\start_intake.mjs`.
2. Send a new DingTalk message after the restart.
3. Confirm logs contain `stream.robot.message.received`, `customer_ledger.capture.pending_saved`, and `customer_ledger.capture.synced`.
4. Confirm Feishu Docx contains the new row by keyword search.

Known live validation on 2026-06-26:

- `#CL-20260626-010`: image write succeeded, but old layout placed the image in the rightmost `文档` cell.
- `#CL-20260626-011`: image write succeeded with the final layout; image is inside the `内容` cell after the text.
- `#CL-20260626-017`: teammate command `记台账：京东金融 26日 订单可获取到手机号吗` was manually backfilled after parser fix; Feishu readback found `260626 / 订单可获取到手机号吗` in `001 京东金融｜项目台账`, revision `4588`.
- Target doc: `005 宜享花｜项目台账` (`WhEOdKEDdotX7VxPRckcFiQsnce`), Feishu readback revision `951`.
- Test command: `D:\nodejs24\npm.cmd test`, result `122 pass / 0 fail`.

## Production Roadmap Notes

The MVP currently depends on a local Windows process. For team-wide use, plan a production owner:

- Deploy to an always-on host: QingLong, cloud VM, container, or Windows service.
- Externalize secrets to the deployment environment; do not rely on the user's desktop `.env`.
- Add a replay job for pending/failed JSONL records.
- Add monitoring: Stream connected, message received count, Feishu write failure count, pending queue age.
- Add access control before opening to all team members: allowed users, departments, groups, customer scope, and audit logs.
- Keep human confirmation boundaries for customer promises, compliance, finance, and sensitive data.
