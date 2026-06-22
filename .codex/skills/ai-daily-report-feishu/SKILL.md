---
name: ai-daily-report-feishu
description: Generate a daily summary of today's Codex work and write it into a Feishu AI daily report document, then backfill the parent Feishu Base record with the report link. Use when the user asks for AI日报, 今日工作总结, Codex 今日工作内容, daily wrap-up, or to write today's work summary into a Feishu wiki/doc/base workflow.
---

# AI 日报写入飞书

Use this skill when the user wants a daily summary of work done with Codex, written into Feishu, with the link backfilled into an upper-level Base.

This skill now depends on the shared reporting conventions in [`E:\Workspace_codex\project000\.codex\skills\automation-reporting\SKILL.md`](E:\Workspace_codex\project000\.codex\skills\automation-reporting\SKILL.md). Apply that skill first whenever the task includes local writeback, Feishu writeback, or both.

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

## Shared reporting and encoding rules

- Never pipe Chinese XML or JSON directly from default PowerShell stdin into `lark-cli`.
- Always route Feishu writes through [`E:\Workspace_codex\project000\scripts\automation\feishu-write-wrapper.ps1`](E:\Workspace_codex\project000\scripts\automation\feishu-write-wrapper.ps1).
- The wrapper is responsible for:
  - forcing UTF-8 without BOM for payload files
  - logging the encoding context and payload preview
  - respecting [`E:\Workspace_codex\project000\scripts\automation\reporting-config.json`](E:\Workspace_codex\project000\scripts\automation\reporting-config.json)
- If `feishu_write_enabled = false`, continue generating the report and writing local artifacts, but skip all Feishu doc/Base writes.
- If the task is local-only, do not call `lark-cli docs ...` or `lark-cli base ...`.

## Body structure

Write the report body with exactly three sections:

1. `概述`
2. `复盘和下一步行动`
3. `明细`

`复盘和下一步行动` rules:

- Always include `建议：...`, `判断：...`, and `待确认：...`.
- Keep only 1-3 most important organization-efficiency actions per day.
- Prefer reusable, promotable, and verifiable actions such as customer risk summaries, group-chat action items, operation reviews, install/deploy scripts, KnowledgeBase templates, and team collaboration workflows.
- Put routine completion details in `明细`, not in the judgment section.
- If the boundary or conclusion is uncertain, write it as `待确认`.

Formatting rules:

- Keep the document title in the Feishu document title, not duplicated again in the body.
- For local KnowledgeBase Markdown, keep the title at the top, put `概述`, `复盘和下一步行动`, and `明细` immediately after it, and move date/report metadata plus related-document indexes to the very end of the file.
- Do not add a fourth `##` section for metadata in local Markdown.
- Use simple XML with `<h2>` and flat `<ul><li>...</li></ul>` blocks.
- Insert one blank paragraph (`<p></p>`) between top-level sections so Feishu displays visible spacing between modules.
- `概述` should be short and management-facing.
- `复盘和下一步行动` should explain what advanced the organization-efficiency goal, Codex's judgment, next recommended actions, and what requires human confirmation.
- `明细` should contain a concise breakdown of completed work grouped by topic.
- Local KnowledgeBase links should be clickable in Obsidian: use relative Markdown links for files inside `E:\KnowledgeBase`, `file:///E:/...` links for external local files, and `[title](https://...)` links for Feishu/DingTalk/GitHub URLs.
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

1. Apply the shared reporting skill and decide the target mode: `local-only`, `feishu-only`, or `dual-write`.
2. Resolve the parent node and identify whether it is wiki/doc/base-backed.
3. Locate the same-day child document by exact title.
4. Reuse-and-overwrite if found; otherwise create the child doc.
5. Write the body with `概述`, `复盘和下一步行动`, and `明细`.
6. Read the document back to confirm all three sections exist and the body is not empty.
7. Backfill the Base record with date and link.
8. Read the Base rows back to confirm the record exists and note whether the link text was normalized.

## Response expectations

Report back:

- The final child document URL.
- Whether the document was reused or newly created.
- Whether the Base row was inserted or skipped as duplicate.
- Whether the Base link cell preserved custom link text or was normalized to raw URL.
- Whether Feishu writes ran or were skipped by config.
