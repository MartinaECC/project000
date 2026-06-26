---
name: jianyun-sms-log
description: Query Jianyun/鉴云管理系统 SMS logs for complaint handling and customer-service evidence collection. Use when Codex needs to open or control a browser for https://info.udatatec.com/system/messages/sms/sms-log, search SMS logs by mobile phone and complaint time, verify send/receive status, or export the result to Excel/CSV. Also use when the user asks to reuse the Jianyun SMS log workflow or mentions 鉴云短信日志、短信日志核查、投诉手机号短信查询.
---

# Jianyun SMS Log

## Core Rule

Use the user's explicit authorization before submitting phone numbers to Jianyun. Treat phone numbers, tokens, screenshots, and exported logs as sensitive. Do not print or save `ACCESS_TOKEN` or cookies. If a queried phone has no rows, record `未查到短信日志` without second-guessing unless the user asks to broaden the date range.

## Standard Workflow

1. Open `https://info.udatatec.com/system/messages/sms/sms-log` in a controllable browser.
2. If redirected to login, ask the user to log in in that same controllable browser window, then continue.
3. Build a de-duplicated phone list from the complaint source, but preserve the original complaint order in the final report when useful.
4. Use the complaint time to choose the send-time range. Default to the whole complaint month:
   - start: `YYYY-MM-01 00:00:00`
   - end: last day of month `23:59:59`
5. Query each phone, keeping all returned SMS rows. Do not merge multiple SMS rows for the same phone.
6. Output the table with the Jianyun page columns:
   `手机号`, `编号`, `创建时间`, `短信内容`, `发送状态`, `接收状态`, `短信渠道`, `是否重试`, `模板编号`, `模板编码`, `短信类型`, `渠道`.
7. If exporting, prefer `.xlsx` on the user's requested path or Desktop. Verify saved row count and headers by reading the file back.

## Preferred Query Method: Browser Login + API

After the user logs in, prefer the backend API over fragile UI date-picker clicks.

Endpoint:

```text
GET /admin-api/system/sms-log/page
```

Required request context:

- Same origin as `https://info.udatatec.com`.
- Header `Authorization` from browser `localStorage.ACCESS_TOKEN`. The stored value is wrapped; unwrap it without displaying it:

```js
function unwrap(raw) {
  const cached = JSON.parse(raw);
  return JSON.parse(cached.v);
}
const token = unwrap(localStorage.getItem("ACCESS_TOKEN"));
```

Common params:

```text
pageNo=1
pageSize=100
mobile=<phone>
sendTime=YYYY-MM-DD 00:00:00
sendTime=YYYY-MM-DD 23:59:59
```

Use repeated `sendTime` params, not comma-joined values. Paginate until `list.length >= total` or the page returns no rows.

Channel labels can be fetched from:

```text
GET /admin-api/system/sms-channel/simple-list
```

Map `channelId` to `signature`; map `channelCode` for display:

```text
ALIYUN -> 阿里云
CHUANGLAN -> 创蓝
LUOSIMAO -> 螺丝帽
```

Status mappings observed in Jianyun:

```text
sendStatus: 10 -> 发送成功, 20 -> 发送失败, 0 -> 等待发送
receiveStatus: 0 -> 等待结果, 10 -> 接收成功, 20 -> 接收失败
templateType: 1 -> 验证码, 2 -> 通知, 3 -> 营销
retryId: present -> 是 <retryId>, empty -> 否
```

For receive status, include `apiReceiveMsg` in parentheses when present, especially for failures such as `内容关键字拦截`, `运营商未知错误`, `签名实名制报备问题`, `号码状态异常`, or `参数错误`.

## Browser Notes

If the user specifically asks to use Edge and no Edge connector is available, launch a controllable Edge instance with a temporary profile and CDP, then ask the user to log in there:

```powershell
$edge = @(
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
$profile = "$env:TEMP\codex-edge-sms-profile"
Start-Process -FilePath $edge -ArgumentList @(
  '--remote-debugging-port=9223',
  "--user-data-dir=$profile",
  '--no-first-run',
  '--new-window',
  'https://info.udatatec.com/system/messages/sms/sms-log'
)
```

Then connect with Playwright over CDP if available:

```js
const { chromium } = await import("playwright");
const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
const context = browser.contexts()[0];
const page = context.pages()[0] || await context.newPage();
```

UI fallback:

- Enter phone in `请输入手机号`.
- Set `发送时间`.
- Click `搜索`.
- Read rows from the visible table.

Prefer API when possible because Jianyun's Element Plus date range picker can fail to sync values if typed manually. If using UI, validate the result by checking that returned row phone numbers match the queried phone.

## Export Guidance

For Excel exports, create at least:

- `汇总`: query range, unique phone count, total SMS rows, receive success/failure counts, per-phone counts.
- `短信日志明细`: one row per SMS log with the standard columns.

Use real `.xlsx`, freeze the header row, enable filters, wrap `短信内容` and `接收状态`, and verify:

- file exists at the requested destination,
- detail sheet range contains expected row count,
- headers match the standard column list,
- no `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, or `#N/A`.

## Direct Data Access Extension

If the user later wants to query the database directly instead of using browser/API, read `references/direct-data-access.md` first. Treat the database path as unconfirmed until credentials, schema, and read-only access are explicitly verified.
