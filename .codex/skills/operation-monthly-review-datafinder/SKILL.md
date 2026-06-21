---
name: operation-monthly-review-datafinder
description: Generate enterprise natural-month operations review drafts using Volcano Engine DataFinder. Use when the user asks for 月复盘, 运营复盘, 企业自然月表现, or 火山数据源/DataFinder-based review drafts, especially with inputs like enterprise short name, target month, title, and target Feishu document.
---

# 运营复盘-月复盘-火山数据源

Use this as the Volcano DataFinder sub-skill for the broader operations review workflow. It drafts an enterprise monthly review from DataFinder metrics, then marks missing business context for manual confirmation.

## Inputs

Require or infer:

- `companyShortName`: enterprise short name, matched against DataFinder virtual property `$_vp_alis_name`.
- `targetMonth`: target natural month in `YYYY-MM`; if absent, use the previous complete natural month.
- `title`: review title; if absent, use `<企业简称><YY年MM月>运营复盘`.
- `docToken` or Feishu doc/wiki URL: destination document for the draft.

## Period Rules

- Always compare natural months: target month vs the immediately preceding natural month.
- Use inclusive dates for display, for example target `2026-05-01` to `2026-05-31`, comparison `2026-04-01` to `2026-04-30`.
- Compute daily averages with the target/comparison natural-month day count.
- Compute month-over-month as `(target - comparison) / comparison`.
- If comparison is zero or missing, mark the MoM value as `待确认` instead of inventing a denominator.

## DataFinder Query Contract

Use Volcano Engine DataFinder only for this sub-skill. Prefer the project helper when available:

```powershell
python scripts\monthly_review_datafinder.py --company <企业简称> --month <YYYY-MM>
```

Current query口径:

- Enterprise field: `$_vp_alis_name`
- Revenue event: `order_suc_back`
- Refund event: `refund_back`
- Amount field: `amount`
- Active revenue/refund: `cycle = 0 OR cycle IS NULL`
- Renewal revenue/refund: `cycle > 0`
- Signup/plan event: `renew_plan_back`
- Cancellation event: `renew_cancel_back`
- Complaint event candidate: `alipay_complaint_back`, but only use it when the business confirms the口径

For amount metrics, group by `$_vp_alis_name` and `amount`, then sum `amount * pv`. For count metrics, group by `$_vp_alis_name` and sum PV.

## Metrics To Calculate

Generate these when the required source fields exist:

- Total revenue: `order_suc_back amount`
- Refund amount: `refund_back amount`
- Net revenue: total revenue minus refund amount
- Daily net revenue: net revenue divided by natural-month days
- Active revenue, active refund, active net revenue, active refund rate
- Renewal revenue, renewal refund, renewal net revenue, renewal refund rate
- Overall refund rate: refund amount divided by total revenue
- Cancellation rate estimate: cancellations divided by signups
- Charge success rate estimate: charge successes divided by charge attempts

Treat charge success rate as provisional unless a confirmed扣款发起 event/denominator is provided.

## Draft Structure

Follow the existing operations review shape:

1. 规则调整总览
2. 收入表现
3. 主动收入
4. 续费收入
5. 退费和客诉表现
6. 报告查看对退费影响
7. 加购数据表现
8. 续费表现
9. 下月重点工作

Write direct conclusions only for metrics that DataFinder supports. For unsupported sections, write `待补充` or `待确认` and state the missing口径.

## Feishu Formatting

- Write tables under each major section when the reference review uses comparison tables.
- Bold key numbers in narrative paragraphs, such as `17.56%`, `1.96pct`, and `2,683.81w`.
- Table MoM cells must be generated with text-color spans before writing: positive values like `+6.17%` or `+1.96pct` use `<span text-color="red">`, negative values use `<span text-color="green">`, and zero values stay plain black text.
- After writing to Feishu, fetch at least one positive and one negative MoM cell to verify whether the service preserved the text color. If Feishu strips the table text color, explicitly report this limitation in the final response; do not silently claim formatting is complete.
- Do not use cell background colors as a fallback unless the user explicitly requests it.
- Keep zero MoM values black/plain.

## Known Gaps

Mark these as `待补充/待确认` until extra data sources or confirmed logic are provided:

- Rule changes, billing-cycle changes, deduction strategy changes, and business attribution.
- Complaint handling status, completion rate, platform split, and full complaint口径.
- Report view rate event name and eligible-user denominator.
- Add-on revenue/refund events, category fields, and product taxonomy.
- Authoritative charge-attempt denominator.

## Multi-source Future Default

When more sources are added, prefer: company data warehouse authoritative metrics, then Volcano behavior/event data, then Feishu knowledge-base business context. Still produce an automated first draft first, followed by an explicit missing-data checklist.
