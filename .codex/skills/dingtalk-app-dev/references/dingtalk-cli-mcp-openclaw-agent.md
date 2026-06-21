# DingTalk CLI, MCP, OpenClaw, And Agent Notes

Last refreshed: 2026-06-21.

Use this reference when the user asks about DingTalk CLI (`dws`), DingTalk MCP Square, OpenClaw DingTalk integration, or DingTalk Agent onboarding and deployment.

## Read First

- Prefer official DingTalk Open Platform docs for current procedures.
- Treat AppKey/Client ID, AppSecret/Client Secret, MCP Server URLs, gateway tokens, and copied URLs containing `key=` as sensitive.
- On this Windows host, prefer `D:\nodejs24\npm.cmd` and `D:\nodejs24\npx.cmd`; PowerShell may block `npm.ps1`.
- When a page asks for browser login or organization selection, use Chrome with the user's existing login state if the user authorizes it.

## Official Doc Map Read

These pages were read in Chrome or from official DingTalk search results:

- DingTalk CLI: `https://open.dingtalk.com/document/development/dingtalk-cli-performing-tasks-within`
- DingTalk MCP overview: `https://open.dingtalk.com/document/development/mcp-square-introduction`
- DingTalk Deap platform using MCP: `https://open.dingtalk.com/document/development/dingtalk-deap-platform-using-mcp-services`
- Alibaba Cloud Bailian using DingTalk MCP: `https://open.dingtalk.com/document/development/alibaba-cloud-uses-dingtalk-mcp-services`
- OpenClaw invokes DingTalk MCP: `https://open.dingtalk.com/document/development/openclaw-invokes-dingtalk-mcp`
- Create DingTalk intelligent Agent app: `https://open.dingtalk.com/document/development/create-dingtalk-intelligent-agent-application`
- Open Claw DingTalk plugin: `https://open.dingtalk.com/document/development/open-claw-nail-insertion-plugin`
- Build DingTalk OpenClaw AI employee: `https://open.dingtalk.com/document/development/build-dingtalk-ai-employees`
- OpenClaw robot manual configuration: `https://open.dingtalk.com/document/development/dingtalk-ai-employees-manual-configuration`
- Local OpenClaw install: `https://open.dingtalk.com/document/development/install-openclaw-locally`
- Alibaba Cloud Simple Application Server deployment: `https://open.dingtalk.com/document/development/deployment-of-alibaba-cloud-light-server`
- Alibaba Cloud ECS deployment: `https://open.dingtalk.com/document/development/deployment-alibaba-cloud-ecs-server`

Sidebar pages observed but not fully URL-resolved in the first pass:

- DingTalk MCP "使用指南"
- Agent solution pages: 企业知识问答 Agent, 个人办公助理 Agent, 项目进度管理 Agent, 多 Agent 垂直专家协同
- Agent onboarding subpage: 一键创建钉钉应用扫码接入流程

If the user asks specifically about one of these unresolved pages, reopen the docs sidebar in Chrome and resolve that page before answering.

## DingTalk CLI (`dws`)

DingTalk Workspace CLI connects AI Agents to DingTalk product capabilities. The docs describe it as the core interface that lets an Agent operate DingTalk with user authorization and preview/confirmation.

Install options:

```powershell
D:\nodejs24\npm.cmd install -g dingtalk-workspace-cli
```

Official script options:

```sh
curl -fsSL https://raw.githubusercontent.com/DingTalk-Real-AI/dingtalk-workspace-cli/main/scripts/install.sh | sh
```

```powershell
irm https://raw.githubusercontent.com/DingTalk-Real-AI/dingtalk-workspace-cli/main/scripts/install.ps1 | iex
```

Common verification:

```powershell
dws --version
dws doctor
```

Auth modes:

```powershell
dws auth login
dws auth login --device
dws auth login --client-id <app-key> --client-secret <app-secret>
```

Upgrade commands:

```powershell
dws upgrade
dws upgrade --check
dws upgrade --list
dws upgrade --version v1.0.7
dws upgrade --rollback
dws upgrade -y
```

Important admin setup:

- Organization may need CLI access enabled in the developer platform.
- Custom app login requires redirect URLs including `http://127.0.0.1` and `https://login.dingtalk.com`.
- Credentials are persisted and refreshed after first login.

Capability areas from the docs include contacts, group chat/IM, calendar, AI tables, todos, approvals, logs, attendance, docs, messages/DING, and related automation surfaces. Use DWS for product operations; use OpenClaw connector and Stream mode for DingTalk robot/channel integration.

## DingTalk MCP Square

DingTalk MCP Square exposes standardized enterprise MCP services. The overview says DingTalk provides 6000+ enterprise MCP services from official DingTalk product wrappers plus ecosystem capabilities.

Key ideas:

- MCP service = a standardized capability/tool package usable by an LLM or Agent.
- Official product wrappers include DingTalk Docs AI, AI Tables, meetings, calendar, todos, approvals, and other workflows.
- Ecosystem MCP services include multimodal AIGC, OCR/ASR/document extraction, vertical industry services, browser automation, ticket booking, enterprise lookup, identity verification, and document processing.
- Access paths:
  - Inside DingTalk: Deap skill center or automation workflows.
  - External systems: standard API/MCP integration into third-party Agent platforms.
- Governance advantages: unified authorization, audit, data isolation, capability recycling, SLA, and usage-based billing through DingTalk/AI compute units.

## Getting MCP Server URLs

The OpenClaw MCP integration doc says:

1. Visit `https://mcp.dingtalk.com`.
2. Log in with a DingTalk account that has the required enterprise permission.
3. Select the correct enterprise.
4. Search/select the MCP service.
5. On the right side, click to get MCP Server service configuration and copy the MCP Server URL.

Example shape:

```text
https://mcp-gw.dingtalk.com/server/xxxxxxxxxxxxxxxx?key=yyyyyyyy
```

Treat this URL as a secret because it contains a key.

## Deap Using MCP

For DingTalk Deap:

- Prepare by selecting the target service in MCP Square.
- Some MCP services require permission application.
- In Deap, create or edit an Agent.
- Add skill -> create MCP service.
- Fill name, description, and HTTP URL.
- Run MCP detection; create only after detection passes.
- Publish the Agent, then test it in Deap.

## Alibaba Cloud Bailian Using MCP

For Bailian:

- Prepare by selecting the target service in MCP Square.
- Some MCP services require permission application.
- In Bailian console, go to MCP management/MCP Square.
- Create MCP using script deployment/custom MCP.
- Use the DingTalk MCP service config from MCP Square.
- Bailian uses `type: "streamableHttp"` while DingTalk config may show `type: "streamable-http"`; normalize as needed.
- Create an Agent app, add the custom MCP service, then call MCP tools.

## OpenClaw Invokes DingTalk MCP

Two official integration paths:

1. Give the MCP Server URL directly to OpenClaw and follow the prompt; OpenClaw can auto-install.
2. Manually install `mcporter` and register MCP services.

Install `mcporter`:

```powershell
D:\nodejs24\npm.cmd install -g mcporter
mcporter --version
```

Manual service registration:

```powershell
mcporter config add dingtalk-contacts --url "<your MCP Server URL>"
mcporter config add dingtalk-calendar --url "<your MCP Server URL>"
```

Verification:

```powershell
mcporter config list
mcporter call dingtalk-contacts list_tools --output json
mcporter call dingtalk-calendar list_tools --output json
```

Example tool sets from the docs:

- Contacts MCP:
  - `search_user_by_key_word`
  - `get_user_info_by_user_ids`
  - `get_sub_depts_by_dept_id`
  - `get_dept_user_list`
  - `get_current_user_profile`
  - `search_user_by_mobile`
  - `search_dept_by_keyword`
  - `get_dept_members_by_deptId`
- Calendar MCP:
  - `create_calendar_event`
  - `list_calendar_events`
  - `update_calendar_event`
  - `delete_calendar_event`
  - `query_busy_status`
  - `query_available_meeting_room`
  - `add_meeting_room`
  - `add_calendar_participant`
  - `remove_calendar_participant`

Common usage examples:

- "帮我查一下张三的 user_id"
- "帮我创建一个明天上午10点的会议，邀请张三和李四"
- "预订一间明天下午3点的会议室"

## Agent App Onboarding

The one-click Agent app doc targets Agents built with OpenClaw, Hermes, and similar frameworks. It creates a DingTalk app/robot that can interact with users through group mentions and direct chat.

Important points:

- Use an organization where the user has developer permission.
- One-click creation creates an app and shows Client ID and Client Secret.
- Store Client ID/Secret securely.
- One-click OpenClaw creation automatically grants:
  - `Card.Streaming.Write`
  - `Card.Instance.Write`
  - `qyapi_robot_sendmsg`
- After app creation, choose a deployment route: Alibaba Cloud Simple Application Server, Alibaba Cloud ECS, or local OpenClaw.

Manual robot configuration:

- Create an enterprise internal app.
- Get Client ID and Client Secret from Credentials & Basic Info.
- Add robot capability.
- Keep robot message receiving mode as Stream mode for OpenClaw connector.
- Add permissions `Card.Streaming.Write`, `Card.Instance.Write`, and `qyapi_robot_sendmsg`.
- Publish the app before expecting it to be usable by the target scope.
- If robot cannot receive messages, first verify Stream connection, app credentials, permissions, and version publication.

## OpenClaw DingTalk Plugin

Official plugin install pattern:

```powershell
openclaw plugins install @dingtalk-real-ai/dingtalk-connector
D:\nodejs24\npx.cmd -y @dingtalk-real-ai/dingtalk-connector install
```

Observed local successful state on this host:

- `OpenClaw 2026.6.8`
- `dingtalk-connector 0.8.23`
- Gateway running at `127.0.0.1:18789`
- `openclaw gateway health` reported `DingTalk: configured`
- The scheduled task may need reinstall if it points to missing `~\.openclaw\gateway.cmd`.

The connector config uses channel id `dingtalk-connector`, not old `dingtalk` nodes. Relevant config areas:

- `channels["dingtalk-connector"].enabled`
- `channels["dingtalk-connector"].clientId`
- `channels["dingtalk-connector"].clientSecret`
- `plugins.entries["dingtalk-connector"].enabled`
- `gateway.mode`
- `gateway.auth`
- `gateway.http.endpoints.chatCompletions.enabled`

Local verification sequence:

```powershell
openclaw plugins list --json
openclaw gateway status
openclaw gateway health
dws doctor
```

Troubleshooting:

- `401`: gateway token/password/auth mismatch.
- `405`: chatCompletions endpoint disabled or wrong endpoint.
- Robot no response: confirm Stream mode, credentials, permissions, app publication, and gateway running.
- AI Card degraded to text: confirm `Card.Streaming.Write` and `Card.Instance.Write`, republish the app.
- Plugin config issues after upgrade: remove old `channels.dingtalk` or legacy `plugins.entries.dingtalk` nodes; reinstall the connector.
- Media/image issues: confirm media upload enabled, logs with `[DingTalk][Media]`, and upload permissions.

## OpenClaw Deployment Notes

Local install doc:

- Official local install command is `curl -fsSL https://openclaw.bot/install.sh | bash`.
- The official page says local installation path only supports macOS and not Windows, but this host already has a working Windows npm-based OpenClaw installation.
- Node.js minimum in docs: v22.22.0. This host uses Node 24.
- Use `openclaw status`, `openclaw dashboard`, `openclaw gateway status`, and `openclaw gateway health` for validation.

Alibaba Cloud Simple Application Server:

- Uses an OpenClaw application image.
- Memory must be at least 2 GiB.
- OpenClaw now uses a random WebUI port for public deployments to reduce scanning risk.
- Keep WebUI public access closed unless needed.
- Do not leak WebUI URLs containing tokens.
- Configure DingTalk channel with Client ID and Client Secret in the server console.

Alibaba Cloud ECS:

- Run the official install script from the doc.
- Installer asks for channel, DingTalk Client ID, DingTalk Client Secret, Bailian Base URL/API Key, and model.
- Successful install shows OpenClaw, DingTalk connector, Gateway running, and config at `~/.openclaw/openclaw.json`.
- If the robot does not reply, use `openclaw logs` and rerun the installer/configuration script as directed.

## Decision Guide

- User asks "用钉钉做事/查数据/发消息/读群/查日程" in Codex: try DWS/installed DingTalk skills first.
- User asks "让 OpenClaw 进入钉钉聊天/机器人回复/群里 @": use DingTalk app + robot + Stream mode + `dingtalk-connector`.
- User asks "让 OpenClaw 调用钉钉官方能力如日历/通讯录/AI表格": use MCP Square to get MCP Server URL, then register via OpenClaw auto prompt or `mcporter`.
- User asks "Deap 内使用 MCP": configure MCP in Deap Agent skill center and publish.
- User asks "百炼里用钉钉 MCP": import/create custom MCP in Bailian, normalize streamable HTTP type, add to Agent app.
- User asks "部署 OpenClaw": choose local/mac, Alibaba Cloud Simple Application Server, or ECS; for this Windows host prefer the already working npm global installation unless the user specifically wants cloud deployment.

## This Host's Working Baseline

- Workspace: `E:\Workspace_codex\project000`.
- Use `D:\nodejs24\npm.cmd` / `D:\nodejs24\npx.cmd`.
- `dws doctor` has previously passed with login valid, while warning about newer DWS versions may be non-blocking.
- OpenClaw Gateway has been configured and can be checked with `openclaw gateway health`.
- If the scheduled task breaks, reinstall it:

```powershell
openclaw gateway uninstall
openclaw gateway install
openclaw gateway status
```
