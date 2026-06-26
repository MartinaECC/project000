---
name: qinglong-automation-deploy
description: Deploy and maintain QingLong scheduled automation tasks. Use when Codex needs to move a local script or report to a QingLong/crontab cloud job, configure one-shot task wrappers, manage scheduler environment variables, deploy DingTalk automated broadcasts, or diagnose QingLong task logs and scheduling failures.
---

# QingLong Automation Deploy

Use this skill for QingLong scheduled jobs, cloud crontab deployments, one-shot script automation, and DingTalk report broadcast deployment through QingLong.

## Core Rules

- Prefer scheduler-owned one-shot jobs. QingLong should trigger a script once per schedule and then let the process exit.
- Do not run long-lived DingTalk Stream clients, HTTP servers, or local bot conversation services inside QingLong unless the user explicitly chooses that architecture.
- Keep secrets in QingLong environment variables. Do not write app secrets, access tokens, DataFinder keys, or group IDs into tracked files.
- Before enabling a production DingTalk broadcast task, confirm the target receiver, group `openConversationId`, schedule, and rollback choice with the user.
- Let failures fail loudly. Do not swallow exceptions or silently downgrade modes; QingLong should show failed runs in logs.

## Deployment Workflow

1. Identify the job.
   - Confirm the business goal, intended schedule, expected output, and whether it sends external messages.
   - Confirm whether the entrypoint is already a one-shot script. If only a long-running service exists, plan a one-shot runner first.

2. Check server prerequisites.
   - Confirm QingLong can access the project directory, Git remote, package registry, DingTalk OpenAPI, DataFinder, and any other upstream API.
   - Confirm Node, npm, Python, Git, and required native dependencies are available.
   - Use [references/qinglong-checklist.md](references/qinglong-checklist.md) for the concrete checks and common failures.

3. Configure the wrapper.
   - Prefer a shell wrapper that changes into the project, pulls code safely, installs dependencies only when needed, verifies Python packages, then runs the one-shot entrypoint.
   - Keep wrapper defaults overridable through environment variables such as `PROJECT_DIR`, `NODE_BIN`, `NPM_BIN`, and `PYTHON_BIN`.

4. Configure QingLong.
   - Put secrets and target IDs in QingLong environment variable management.
   - Create the task with a clear name, command, and cron expression.
   - Do one manual run before enabling unattended schedule.

5. Verify and roll back.
   - Inspect QingLong logs for a success event and real target delivery when the task sends messages.
   - Wait for the next scheduled run if the task is time-sensitive.
   - If a duplicate local service exists, disable one side before production use to avoid double sending.

## DingTalk Broadcasts

For DingTalk report broadcasts, read [references/dingtalk-broadcast.md](references/dingtalk-broadcast.md).

Key defaults:

- QingLong triggers the one-shot broadcast runner.
- DingTalk rendering and delivery rules still live in `dingtalk-app-dev`.
- For refund-rate broadcasts in this project, reuse `scripts/ql_refund_report.sh` and `scripts/send_refund_report_once.mjs`.

## Validation

Before saying a QingLong deployment is ready:

1. Verify the one-shot script runs locally or with an equivalent dry run.
2. Verify the QingLong command path, cron expression, and environment variables.
3. Manually run the QingLong task once.
4. Inspect logs for the expected completion event.
5. For production schedules, wait for one real scheduled trigger and verify it completed.
6. Confirm the external side effect only after the user has approved the receiver and test run.
