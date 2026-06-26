# QingLong Deployment Checklist

Use this checklist before creating, enabling, or diagnosing a QingLong scheduled job.

## Server Checks

- Confirm the project path exists on the server, for example `/ql/data/scripts/project000`.
- Confirm the command can run from a non-interactive shell.
- Confirm Git can access the remote if the wrapper runs `git pull --ff-only`.
- Confirm Node and npm are available, or set `NODE_BIN` and `NPM_BIN`.
- Confirm Python is available, or set `PYTHON_BIN`.
- Confirm required Python packages can be imported, especially `rangersdk` for DataFinder tasks.
- Confirm native Node dependencies such as `sharp` can install on the server.
- Confirm the server can reach DingTalk OpenAPI, DataFinder, package registries, and any internal APIs.

## QingLong Panel Checks

- Task name clearly identifies the business job.
- Command uses an absolute or stable path, for example `bash /ql/data/scripts/project000/scripts/ql_refund_report.sh`.
- Cron expression matches the desired schedule and timezone.
- Environment variables are defined in QingLong's environment manager, not embedded in the command.
- The task is manually run once before enabling unattended use.
- Logs are inspected after both manual run and first scheduled run.
- For migrations from a local service, confirm the old local sender is stopped before or immediately after enabling QingLong.

## Common Failures

- Wrong project path: wrapper cannot `cd` into `PROJECT_DIR`.
- Missing dependencies: `npm ci` fails or Python cannot import required packages.
- Native package failure: image rendering dependencies such as `sharp` fail to install on Linux.
- Missing Linux fonts/fontconfig: SVG-to-PNG rendering can succeed but Chinese text may disappear or become unreadable. For image-table DingTalk cards, provide a project-local `vendor/fonts/fonts.conf` and Chinese font files, then export `FONTCONFIG_FILE` before running Node.
- Missing environment variable: the one-shot runner fails before sending.
- Wrong receiver: DingTalk group delivery needs `openConversationId`, not group name or ordinary group number.
- Duplicate sends: local service and QingLong task are both active.
- Schedule left in a safety value: a temporary cron such as `59 23 31 12 *` prevents hourly delivery; production hourly reports should use `0 * * * *`.
- Silent degradation: scripts catch errors and exit successfully, making QingLong show a false success.

## Logging Expectations

Prefer structured JSON logs from one-shot scripts:

- job start and end timestamp
- render mode and delivery target
- target counts without exposing raw secrets
- upstream query windows when data is time-based
- a stable success event name
- error name and message on failure

Do not log secrets, access tokens, app secrets, or raw credential files.
