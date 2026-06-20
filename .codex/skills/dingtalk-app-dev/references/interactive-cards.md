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
- Place a concise methodology line inside the image, between title/time and the table: `口径说明：数据统计范围为今日 00:00 至当前整点；括号内依次为昨日同整点值、环比变化，退费率另展示百分点差异（pp）。`
- For refund-rate image tables, include columns in this order: `企业名称 | 退费率 | 退费后金额 | 支付金额 | 支付数 | 退费金额 | 退费数`.
- Calculate `退费后金额` as `支付金额 - 退费金额`, show current value plus yesterday same-hour value and relative change like other amount metrics, and sort company rows by current `退费后金额` descending while keeping the total row first.
- Format metric cells as two lines: current value on the first line, then the comparison in parentheses on the second line.
- Keep comparison text compact: `当前值（昨日值，环比变化）`; for rates, include pp difference: `17.04%（21.36%，-20.21% / -4.32pp）`.
- Add SVG `clipPath` around table cell text so long values cannot draw into adjacent columns.

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
   - Assert `JSON.parse(cardData).contents[0].type` is `markdown`.
   - Assert the full body text is present.
2. Send a small real card to the intended robot single chat.
3. Confirm the DingTalk client renders the body, not only the title.
4. Send the full alert/report.
5. Restart the long-running bot service and confirm logs show the new card path enabled.

## Project Defaults

In this project, prefer these environment names:

- `DINGTALK_CLIENT_ID`: app key/client ID.
- `DINGTALK_CLIENT_SECRET`: app secret/client secret.
- `DINGTALK_BOT_ID`: robot code used for sending.
- `REFUND_REPORT_USER_IDS`: comma-separated encrypted DingTalk user IDs for single-chat report delivery.
- `REFUND_REPORT_CARD_TEMPLATE_ID`: default to `StandardCard`.
- `DINGTALK_API_BASE_URL`: default to `https://api.dingtalk.com`.

On this Windows host, prefer `D:\nodejs24\npm.cmd` over `npm.ps1` when running tests or starting Node scripts.
