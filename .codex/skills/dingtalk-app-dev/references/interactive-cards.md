# DingTalk Interactive Cards

Use this reference when implementing DingTalk robot alerts, operational reports, formatted bot replies, or interactive communication cards.

## Known Good Pattern

For a robot single-chat or group notification that needs formatted content:

1. Obtain an app access token:
   - `POST https://api.dingtalk.com/v1.0/oauth2/accessToken`
   - Body: `{ "appKey": DINGTALK_CLIENT_ID, "appSecret": DINGTALK_CLIENT_SECRET }`
   - Use the returned token as `x-acs-dingtalk-access-token`.
2. Send a normal robot interactive card:
   - `POST https://api.dingtalk.com/v1.0/im/v1.0/robot/interactiveCards/send`
   - Use `cardTemplateId: "StandardCard"` for the ordinary card-builder/JSON-card path.
   - Use `robotCode` from the app robot code, usually the same configured value as `DINGTALK_BOT_ID`.
   - Use a unique `cardBizId` per new card message.
   - For single chat, set `singleChatReceiver` to a JSON string such as `{"userId":"096..."}`.
   - For group chat, set `openConversationId` to the confirmed DingTalk group `openConversationId`. Do not use the group name or ordinary group number as a replacement.
   - Set `cardData` to a JSON string containing the full card layout.
3. Put report body content into a Markdown-capable card component:
   - Use `contents: [{ "type": "markdown", "text": "...", "id": "..." }]`.
   - Do not use `type: "text"` when the content is expected to render Markdown.

Minimal body shape:

```json
{
  "cardTemplateId": "StandardCard",
  "singleChatReceiver": "{\"userId\":\"USER_ID\"}",
  "cardBizId": "refund-report-1760000000000",
  "robotCode": "ding...",
  "cardData": "{\"config\":{\"autoLayout\":true,\"enableForward\":true},\"header\":{\"title\":{\"type\":\"text\",\"text\":\"退费率播报\"}},\"contents\":[{\"type\":\"markdown\",\"text\":\"# 退费率播报\\n\\n#### 总览\\n退费率：**12.34%**\",\"id\":\"refund_report_content\"}]}"
}
```

## Card Data Shape

Use a standard card JSON object, then `JSON.stringify` it into the API field `cardData`.

```ts
function buildStandardCardData(title: string, markdown: string) {
  return {
    config: {
      autoLayout: true,
      enableForward: true
    },
    header: {
      title: {
        type: 'text',
        text: title
      }
    },
    contents: [
      {
        type: 'markdown',
        text: markdown,
        id: 'report_content'
      }
    ]
  };
}
```

The card-builder docs call this a "富文本模块". Its `type` is `markdown`, and it supports line breaks, bold, italics, links, images, font size, font color, and DingTalk emoji syntax.

## Product Display Modes

DingTalk report broadcasts should treat display mode as an explicit product option:

- `markdown`: use a `StandardCard` markdown component for short reports, summaries, anomaly explanations, and copy-friendly text.
- `image`: render complex tables to PNG and embed the image in a `StandardCard` markdown component for multi-row or multi-column operational reports.

Selection rules:

- Use `image` by default for long operational reports that many people need to scan, compare, or forward.
- Use `markdown` by default for short alerts, single-customer notes, anomaly summaries, or content the user may need to copy.
- If the user explicitly chooses Markdown text or chart/image mode, follow that choice.
- Keep both code paths available behind configuration such as `REFUND_REPORT_RENDER_MODE=markdown|image`.
- Do not silently downgrade from image to markdown on image generation or upload failure. Log the failure and send a clear failure card or alert, then switch configuration deliberately if rollback is needed.
- Treat delivery target as an explicit product option when a report may move between single chat and group chat. For this project, use `REFUND_REPORT_DELIVERY_TARGET=single|group|both`.
- For refund-rate broadcasts, the validated group-chat sample target is the DingTalk group named `AI助手组`. Do not hard-code its conversation ID in documentation or skills; resolve and confirm `openConversationId` from configuration or DWS when needed.

## Scheduled Cloud Jobs

For cloud-hosted scheduled report broadcasts, prefer a scheduler-owned one-shot job instead of starting the long-running Stream service:

- Use QingLong or cron to trigger one run at each schedule point.
- Keep `src/index.ts` for Stream robot conversations and local long-running service mode.
- Put the reusable report execution in a one-shot entry such as `scripts/send_refund_report_once.mjs`.
- Let the scheduler call a shell wrapper such as `scripts/ql_refund_report.sh` to pull latest code, ensure dependencies, and execute the one-shot entry.
- Store DingTalk, DataFinder, and LLM secrets in the scheduler's environment variable manager, not in tracked files.
- Let failures bubble up so the scheduler marks the task failed; do not swallow errors or silently downgrade modes.

For the refund-rate report QingLong task, use:

```text
name: 退费率播报-钉钉卡片
command: bash /ql/data/scripts/project000/scripts/ql_refund_report.sh
cron: 0 * * * *
```

## Typography And Spacing In Card Markdown

For `StandardCard` markdown content, prefer DingTalk markdown variables and design tokens over generic Markdown headings or numeric HTML font sizes.

Known-good title helpers:

```ts
function titleHeading(text: string): string {
  return `<font sizeToken=common_h1_text_style__font_size>**${text}**</font>`;
}

function timeHeading(text: string): string {
  return `<font sizeToken=common_h2_text_style__font_size>**${text}**</font>`;
}

function sectionHeading(text: string): string {
  return `<font sizeToken=common_h3_text_style__font_size>**${text}**</font>`;
}

function spacer(): string {
  return '&nbsp;';
}
```

Use these as follows:

```md
<font sizeToken=common_h1_text_style__font_size>**退费率播报**</font>
<font sizeToken=common_h2_text_style__font_size>**时间: 2026-06-20 22:29:00**</font>
&nbsp;
<font sizeToken=common_h3_text_style__font_size>**总览**</font>
退费率：19.08%
```

Practical rules from real DingTalk client validation:

- Use `sizeToken=common_h1_text_style__font_size` for the report title.
- Use `sizeToken=common_h2_text_style__font_size` for time or subtitle lines.
- Use `sizeToken=common_h3_text_style__font_size` for section headings such as `总览`, customer names, company names, or `异常总结`.
- Use a standalone `&nbsp;` line when a visible blank line is needed between sections.
- Keep exactly one spacer line between sections unless the user explicitly asks for more separation.
- Still wrap heading text in `**...**`; the token controls size, bold improves visual weight.

Avoid these formats in `StandardCard` markdown:

- `#`, `##`, `###` when the user needs clearly different font sizes. In observed robot cards, these rendered too close to normal bold text.
- `<font size=70>...</font>` or other numeric `size=...` values. These did not produce the expected large text.
- Consecutive empty lines for vertical spacing. DingTalk may collapse them.
- `<br/><br/>` for spacing. In observed cards, this produced a very large blank block.

## Image Table Card Style

For DingTalk card image tables, use this visual style unless the user gives a newer reference:

- Put only the report title and report time in the card Markdown body, then append the image. Do not duplicate long summary or anomaly text above the image.
- Render the table into a PNG image from SVG when the report has many rows or columns.
- Use the table header fill `#B5C6EA` with dark header text `#111827`.
- Use a white page background, zebra body rows `#ffffff` / `#f7f7f8`, and a light blue total row `#eef6ff`.
- Use conditional cell backgrounds only where useful: light red for concerning increases, light green for notable decreases, and light yellow for zero-payment-with-refund rows.
- Place a concise methodology line inside the image, between title/time and the table. For normal hourly reports use `口径说明：数据统计范围为今日 00:00 至当前整点；括号内依次为昨日同整点值、环比变化，退费率另展示百分点差异（pp）。`; for the midnight-hour special window use wording that says yesterday full day is compared with the previous full day.
- For refund-rate image tables, include columns in this order: `企业名称 | 退费率 | 退费后金额 | 支付金额 | 支付数 | c0收入 | 退费金额 | 退费数`.
- Calculate `退费后金额` as `支付金额 - 退费金额`, show current value plus yesterday same-hour value and relative change like other amount metrics, and sort company rows by current `退费后金额` descending while keeping the total row first.
- Format metric cells as three lines when full-day references are available: current value on the first line, yesterday same-hour comparison in parentheses on the second line, and `前日 ...｜昨日 ...` full-day reference on the third line.
- Keep comparison text compact: line 2 should be `（昨日值，环比变化）`; for rates, include pp difference such as `（21.36%，-20.21% / -4.32pp）`. Line 3 full-day references should be `前日 ...｜昨日 ...` with no comparison calculation.
- Add SVG `clipPath` around table cell text so long values cannot draw into adjacent columns.

## DataFinder Report Metric Rules

Use these rules for DingTalk report broadcasts backed by Volcano Engine DataFinder:

- For amount totals shown as DataFinder `合计值`, do not group by `amount` and then calculate `amount * events`. That approximation can drift from the DataFinder UI.
- Query amount totals with `event_indicator: "measure"` and `measure_info: { "measure_type": "sum", "property_name": "amount", "property_type": "event_param" }`.
- Group amount-total queries only by the business dimension needed in the report, normally the virtual company field `$_vp_alis_name`.
- Query event counts separately with `event_indicator: "events"` grouped by the same business dimension.
- For `c0收入`, use the same `measure sum(amount)` amount-total query on `order_suc_back`, with `cycle = 0` as an event filter.
- For same-hour comparisons, always compare matching partial-day windows. Example: if the current window is `2026-06-21 00:00-09:00`, the baseline window is `2026-06-20 00:00-09:00`, not the full previous day.
- For the midnight hour (`00:00-00:59`), use yesterday full day as current and the day before yesterday full day as baseline.
- Non-full-day windows should use `hour` granularity and sum all returned hour buckets.
- Full-day reference windows should use `day` granularity, but the DataFinder request range must stay on the same calendar day. For example, query June 19 full day as `range=[2026-06-19 00:00, 2026-06-19 00:00]`, not `range=[2026-06-19 00:00, 2026-06-20 00:00]`; the latter can return June 19 plus June 20.
- Log the actual DataFinder windows and metric mode before sending a card. For amount totals, include a field such as `amountMetric: "measure_sum_amount"`.

Known optimization point:

- Small differences can still appear between a live DataFinder API query and a screenshot/export from the DataFinder UI, even after switching to `measure sum(amount)`. Treat the current implementation as basically accurate, but leave a future optimization item to compare the exact UI query payload, cache behavior, and any hidden UI filters when strict cent-level parity is required.

## Permission Checklist

Before debugging code, verify app permissions in DingTalk Open Platform:

- Robot messaging permission: `企业内机器人发送消息权限`.
- Interactive card instance/write permission may be needed depending on the API path: `Card.Instance.Write`.
- If the API returns `Forbidden.AccessDenied.AccessTokenPermissionDenied`, open the permission apply URL in the error body and enable the named scope for the exact app.

After enabling permissions, retry with a fresh access token if possible.

## Pitfalls From The Refund-Rate Report Work

- `send-by-bot --text` is not reliable for long formatted single-chat messages. It can show only the title/first line, flatten Markdown, or force awkward split segments.
- Sending a whole Markdown string as ordinary text does not guarantee card rendering in DingTalk single chat.
- The card-builder URL parameter `templateId=<uuid>` is not the same as the normal robot card `cardTemplateId` for `interactiveCards/send`.
- Calling `/v1.0/card/instances` with the card-builder UUID can fail with `param.templateNotExist`.
- For the normal robot interactive-card path, use `/v1.0/im/v1.0/robot/interactiveCards/send` and `cardTemplateId: "StandardCard"`.
- A `type: "text"` component displays Markdown syntax literally; use `type: "markdown"`.
- Do not split operational reports into multiple bot messages unless the product requirement explicitly asks for chunks. Prefer one card with one complete content block.
- For card typography, do not use `font size=70/60`; use `sizeToken` design tokens instead.
- For visible blank lines, do not rely on empty lines or repeated `<br/>`; use a standalone `&nbsp;` spacer line.
- Do not print app secrets or access tokens in logs. It is fine to log booleans such as `hasDingTalkClientSecret`.
- If a previously started service is still running, it may keep sending old-format messages. Stop the process on the health-check port and restart after code/config changes.

## Verification Flow

1. Unit-test the request body:
   - Assert the URL is `/v1.0/im/v1.0/robot/interactiveCards/send`.
   - Assert `cardTemplateId` is `StandardCard`.
   - Assert `singleChatReceiver` is a JSON string.
   - For group delivery, assert `openConversationId` is present and `singleChatReceiver` is absent.
   - Assert `JSON.parse(cardData).contents[0].type` is `markdown`.
   - Assert the full body text is present.
2. Send a small real card to the intended robot single chat.
3. Confirm the DingTalk client renders the body, not only the title.
4. Send the full alert/report.
5. Restart the long-running bot service and confirm logs show the new card path enabled.

For switching a scheduled report from single chat to group chat:

1. Use DWS to search the group by name, for example `dws chat search --keyword "AI助手组" --format json`.
2. Ask the user to confirm the selected group and its `openConversationId`.
3. Set `REFUND_REPORT_DELIVERY_TARGET=group` and `REFUND_REPORT_GROUP_CONVERSATION_ID=<confirmed openConversationId>`.
4. Send a small real card to the group before sending the full report.
5. Send one full report manually and confirm the card renders correctly.
6. Restart the long-running service, then verify logs show `deliveryTarget: "group"`, `groupCount: 1`, and `singleUserCount: 0`.

## Project Defaults

In this project, prefer these environment names:

- `DINGTALK_CLIENT_ID`: app key/client ID.
- `DINGTALK_CLIENT_SECRET`: app secret/client secret.
- `DINGTALK_BOT_ID`: robot code used for sending.
- `REFUND_REPORT_USER_IDS`: comma-separated encrypted DingTalk user IDs for single-chat report delivery.
- `REFUND_REPORT_DELIVERY_TARGET`: `single`, `group`, or `both`; default to `single` for backward compatibility.
- `REFUND_REPORT_GROUP_CONVERSATION_ID`: DingTalk group `openConversationId` for group report delivery. It may fall back to `DINGTALK_DEFAULT_GROUP_CONVERSATION_ID` in the project config.
- `REFUND_REPORT_CARD_TEMPLATE_ID`: default to `StandardCard`.
- `DINGTALK_API_BASE_URL`: default to `https://api.dingtalk.com`.

On this Windows host, prefer `D:\nodejs24\npm.cmd` over `npm.ps1` when running tests or starting Node scripts.
