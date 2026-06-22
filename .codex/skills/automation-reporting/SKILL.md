---
name: automation-reporting
description: Shared reporting conventions for recurring AI日报, 周报, 月报, and similar operational summaries that may write to local KnowledgeBase, Feishu, or both. Use when a task includes report generation, local/Feishu dual-write decisions, or reporting automation hardening.
---

# 自动化汇报通用规范

Use this skill for recurring reports such as AI日报, AI周报, AI月报, customer summaries, operation reviews, and similar automations.

This skill exists to prevent repeated mistakes in three areas:

- Chinese payload encoding when writing to Feishu
- choosing the right write target: local only, Feishu only, or both
- verification and deduplication for recurring report automations

## Shared infrastructure

Current shared files:

- config: [`E:\Workspace_codex\project000\scripts\automation\reporting-config.json`](E:\Workspace_codex\project000\scripts\automation\reporting-config.json)
- Feishu write wrapper: [`E:\Workspace_codex\project000\scripts\automation\feishu-write-wrapper.ps1`](E:\Workspace_codex\project000\scripts\automation\feishu-write-wrapper.ps1)

Current default mode:

- `mode = "local-only"`
- `feishu_write_enabled = false`

Do not bypass the wrapper for Feishu document or Base writes.

## Root cause lesson: Feishu乱码 was caused before Feishu

The confirmed failure mode on this Windows PowerShell host was:

- `[Console]::OutputEncoding` had been set to UTF-8
- but `$OutputEncoding` was still `us-ascii`
- Chinese text piped to an external process was degraded before `lark-cli` received it
- result: titles like `AI周报 | 2026-W25` arrived as `AI?? | 2026-W25`

Implication:

- the problem was not primarily Feishu rendering
- the unsafe step was PowerShell pipe encoding to the external process

## Mandatory encoding rules

For any Chinese report payload sent to Feishu:

- never send XML or JSON through the default PowerShell pipeline
- always normalize payloads into UTF-8 without BOM files first
- prefer `--content @file` or equivalent file-backed input
- if stdin is unavoidable, set both:
  - `$OutputEncoding = [System.Text.UTF8Encoding]::new($false)`
  - `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)`
- even with explicit UTF-8, keep one implementation path only; do not mix pipe-based and file-based writes casually

Recommended default:

- write a temporary UTF-8 no BOM payload file
- call the shared wrapper
- let the wrapper log the encoding context and payload preview

## Logging contract

Before any Feishu write attempt, record structured logs locally.

Minimum fields:

- automation id
- action name such as `docs-create`, `docs-update`, `base-record-create`, `base-record-update`
- `[Console]::OutputEncoding.WebName`
- `$OutputEncoding.WebName`
- `[System.Text.Encoding]::Default.WebName`
- payload source
- payload preview
- payload hex prefix
- dry-run flag
- `feishu_write_enabled`
- mode
- timestamp

Current log destination pattern:

- `C:\Users\Administrator\.codex\automations\<automation-id>\logs\feishu-write.ndjson`

These logs are local-only. Do not mirror them into Feishu.

## Write target decision

Every reporting task must choose one of three modes explicitly:

### 1. `local-only`

Use when:

- Feishu is paused due to risk or incident mitigation
- the user explicitly asks for local output only
- the report is an internal draft or intermediate artifact

Rules:

- generate the report normally
- write the local Markdown or other local artifact
- run local validation
- skip all Feishu doc/Base writes
- record `feishu_write_skipped = true`

### 2. `feishu-only`

Use when:

- the output is intended only for a Feishu doc/wiki/base workflow
- the user explicitly does not want a local copy

Rules:

- still keep local temporary payload files and local write logs for safety
- verify remote writeback and deduplication

### 3. `dual-write`

Use when:

- the report is an operational record that should live in both KnowledgeBase and Feishu
- the user explicitly requires both destinations

Rules:

- generate the report once
- write local first
- validate local completeness
- then write Feishu through the wrapper
- verify Feishu document body and Base backfill separately
- deduplicate both destinations

If the user does not specify the mode:

- follow the shared config and current incident status
- state the chosen mode clearly in the run result

## Execution order

For recurring report automations:

1. Read the prior automation memory if the workflow has a memory file.
2. Gather source data from the required systems.
3. Generate one canonical report body.
4. Decide and record the target mode.
5. Write local artifacts first when local output is required.
6. If Feishu is enabled, write through the shared wrapper only.
7. Read back and verify each written destination.
8. Record duplicates, skips, and validation results explicitly.

## Verification checklist

### Local verification

- target file exists
- metadata block is complete
- required sections are present and non-empty
- file path matches the requested KnowledgeBase location

### Feishu verification

- document exists at the intended wiki/doc location
- required sections are present and non-empty
- if Base is part of the workflow, the record exists exactly once
- no duplicate report node or duplicate Base row was created

### Incident-safe fallback

If Feishu write safety is uncertain:

- leave `feishu_write_enabled = false`
- continue producing local artifacts
- keep logs for later dry-run validation

## Report-type guidance

Common expectations for future automations:

- 日报: often `dual-write`, but must support `local-only`
- 周报: often `dual-write`, especially when management visibility matters
- 月报: often `dual-write` or `feishu-only`, depending on the publishing workflow
- ad hoc summaries or debugging logs: often `local-only`

Do not assume every report needs both destinations. The task contract or current config decides.

## Daily report judgment structure

For AI日报 and similar daily reports, keep the body to the required three sections and make `复盘和下一步行动` judgment-led:

- Always include exactly these three information types: `建议：...`, `判断：...`, and `待确认：...`.
- Keep only 1-3 most important organization-efficiency actions per day.
- Prefer actions that are reusable, promotable, and verifiable, such as customer risk summaries, group-chat action items, operation reviews, install/deploy scripts, KnowledgeBase templates, and team collaboration workflows.
- Put routine completion details in `明细`, not in `复盘和下一步行动`.
- When uncertain, label the item as `待确认` instead of turning it into a conclusion.

## Local Markdown layout

For local KnowledgeBase reports:

- Keep the document title as the first line.
- Put the three body sections immediately after the title: `概述`, `复盘和下一步行动`, and `明细`.
- Move metadata and indexes to the very end of the file, after `明细`.
- Metadata includes date or period, Feishu link, report type, core goal, source report index, related document index, local path, and filename notes.
- Do not add a fourth `##` section for metadata; keep it as plain text and lists after the body.

## Practical rule for future work

When the user asks for “写汇报”, “生成日报/周报/月报”, or similar:

- first decide whether this is `local-only`, `feishu-only`, or `dual-write`
- if Feishu is involved, use the wrapper and config
- if Chinese content is involved, prefer UTF-8 no BOM file input
- always verify and deduplicate after writing
