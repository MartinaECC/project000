# DingTalk Broadcasts On QingLong

Use this reference when deploying DingTalk automated broadcasts, monitoring alerts, or report cards through QingLong.

## Recommended Architecture

Use QingLong as the scheduler and keep the report process one-shot:

```text
QingLong cron
  -> scripts/ql_refund_report.sh
  -> scripts/send_refund_report_once.mjs
  -> DingTalk interactive card
```

Do not start the long-running DingTalk Stream service from QingLong for scheduled report delivery. Keep Stream and local conversation services separate.

## Refund-Rate Report Default Task

Use this QingLong task shape unless the user changes it:

```text
name: 退费率播报-钉钉卡片
command: bash /ql/data/scripts/project000/scripts/ql_refund_report.sh
cron: 0 * * * *
```

Current production pattern for the project refund-rate broadcast:

- QingLong owns the hourly schedule.
- The local `3002` long-running service should not send the refund-rate hourly report while QingLong is enabled.
- Verify the transition by waiting for a real scheduled run, not only by clicking "run" manually.
- A successful hourly cutover should show `refund_report.once.completed`, `groupCount=1`, and `singleUserCount=0` for the confirmed group-only deployment.

The wrapper should:

- enter the project directory
- run `git pull --ff-only` when the directory is a Git worktree
- run `npm ci` only when `node_modules` is missing or `package-lock.json` changed
- ensure Python can import `rangersdk`
- execute `node scripts/send_refund_report_once.mjs`

## Environment Variables

Keep all real values in QingLong environment variables, not in tracked files.

Required for the refund-rate DingTalk broadcast:

- `DINGTALK_CLIENT_ID`
- `DINGTALK_CLIENT_SECRET`
- `DINGTALK_BOT_ID`
- `DATAFINDER_APP_ID`
- `DATAFINDER_ACCESS_KEY`
- `DATAFINDER_SECRET_KEY`
- one delivery target:
  - group: `REFUND_REPORT_DELIVERY_TARGET=group` plus `REFUND_REPORT_GROUP_CONVERSATION_ID`
  - single chat: `REFUND_REPORT_DELIVERY_TARGET=single` plus `REFUND_REPORT_USER_IDS`
  - both: both sets of target variables

Recommended:

- `REFUND_REPORT_RENDER_MODE=image`
- `REFUND_REPORT_CARD_TEMPLATE_ID=StandardCard`
- `REFUND_REPORT_TIMEZONE=Asia/Shanghai`
- `REFUND_REPORT_THRESHOLD_PERCENT=10`

Optional wrapper overrides:

- `PROJECT_DIR`
- `NODE_BIN`
- `NPM_BIN`
- `PYTHON_BIN`

## Receiver Confirmation Gate

Stop and ask the user before changing or enabling a real receiver:

- For group delivery, confirm the group `openConversationId`; do not use a group name or ordinary group number.
- For single chat, confirm the DingTalk user ID list.
- For `both`, confirm both targets and explain that it will send duplicate copies to different destinations.

After confirmation, send a small test card first, then the full report.

## Verification

For a successful manual QingLong run, expect:

- QingLong log contains a JSON completion event such as `refund_report.once.completed`.
- DingTalk receives the expected card at the confirmed target.
- In group mode, logs show one group target and zero single-chat targets.
- If the task fails, QingLong marks it failed and the log shows the thrown error.

Before leaving the task enabled, check whether the local long-running service is still sending the same report. If both QingLong and local service are active, the report may be sent twice.

For the refund-rate report, also verify that the local `3002` port is not listening after QingLong takes over production delivery.

## Rollback

Use the smallest rollback that matches the incident:

- Disable the QingLong task if cloud delivery is unstable.
- Switch `REFUND_REPORT_RENDER_MODE=markdown` if image rendering or upload is unstable.
- Switch `REFUND_REPORT_DELIVERY_TARGET=single` only after confirming the intended single-chat receiver.
- Re-enable the local service only after confirming QingLong is disabled or the schedule will not overlap.
