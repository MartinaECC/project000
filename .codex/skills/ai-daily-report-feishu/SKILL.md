---
name: ai-daily-report-feishu
description: Generate a daily summary of today's Codex work and write it into a Feishu AI daily report document, then backfill the parent Feishu Base record with the report link. Use when the user asks for AI日报, 今日工作总结, Codex 今日工作内容, daily wrap-up, or to write today's work summary into a Feishu wiki/doc/base workflow.
---

# AI 日报写入飞书

Use this skill when the user wants a daily summary of work done with Codex, written into Feishu, with the link backfilled into an upper-level Base.

## Inputs

Require or infer:

- A Feishu parent wiki/base URL or token that acts as the daily report container.
- The target date. If absent, use today's local date in `YYYYMMDD`.
- The already prepared daily summary content, or the conversation context needed to summarize today's work.

## Default document contract

- Child report title format: `AI日报 | YYYYMMDD`
- Reuse the same-day child document if it already exists.
- If the same-day document exists, overwrite its body instead of creating a duplicate.
- Only create a new child doc when no same-day document exists under the target parent.

## Feishu routing rules

- First resolve the parent node with `wiki +node-get`.
- If the parent node is a `docx`, create the child doc under that wiki node.
- If the parent node is a `bitable`, treat it as the report index. Still create or reuse the child doc under the same wiki parent node, then backfill the Base entry.
- Prefer user identity: `--as user`.

## Body structure

Write the report body with exactly two sections:

1. `概述`
2. `明细`

Formatting rules:

- Keep the document title in the Feishu document title, not duplicated again in the body.
- Use simple XML with `<h2>` and flat `<ul><li>...</li></ul>` blocks.
- `概述` should be short and management-facing.
- `明细` should contain the fuller breakdown of the day's work grouped by topic.
- Prefer `docs +update --command overwrite` for this report flow because the daily report is a whole-document snapshot.

## Base backfill contract

When the parent flow includes a Base:

- Inspect the Base tables and fields first.
- If there is a single obvious table, use it; otherwise read the structure before writing.
- For the current `AI工作日报` pattern, the expected table is often `数据表` and the expected fields are:
  - `创建日期`
  - `文档地址`
- Before inserting, read existing rows and skip insertion if the same report link already exists.

## Important platform behavior

Feishu Base may normalize a Markdown-style link in a text/url field back to a raw URL display label on readback.

Implications:

- You may still write `[AI日报 | YYYYMMDD](https://...)`, but do not promise the cell will display the title text.
- If the user explicitly wants the visible title preserved in the table, recommend adding a separate text field such as `标题`, while keeping `文档地址` as the real link field.
- Always verify this by reading the record back after update or insert.

## Suggested execution order

1. Resolve the parent node and identify whether it is wiki/doc/base-backed.
2. Locate the same-day child document by exact title.
3. Reuse-and-overwrite if found; otherwise create the child doc.
4. Write the body with `概述` and `明细`.
5. Read the document back to confirm both sections exist and the body is not empty.
6. Backfill the Base record with date and link.
7. Read the Base rows back to confirm the record exists and note whether the link text was normalized.

## Response expectations

Report back:

- The final child document URL.
- Whether the document was reused or newly created.
- Whether the Base row was inserted or skipped as duplicate.
- Whether the Base link cell preserved custom link text or was normalized to raw URL.
