---
name: dingtalk-app-dev
description: Create and maintain DingTalk enterprise internal apps and robots. Use when Codex needs to build DingTalk app services, add or configure robots, set up Stream event subscriptions, diagnose Stream mode setup failures, wire dingtalk-stream SDK callbacks, send monitoring alerts, implement robot-to-user or robot-to-group interactive communication, or send DingTalk interactive cards with rich Markdown-style layout.
---

# DingTalk App Dev

Use this skill for DingTalk enterprise internal application and robot development, especially Stream-mode robot message/event subscription setup, robot alert delivery, and interactive-card communication.

## Core Workflow

1. Clarify the target app and robot.
   - Identify whether the user is creating a new enterprise internal app or updating an existing app.
   - Confirm the AppKey/ClientID, AppSecret/ClientSecret, robot code, and intended event types when available.
   - Treat secrets as sensitive: do not print them in logs or final answers.

2. Configure the DingTalk application in the correct order.
   - Create the enterprise internal application.
   - Add the robot capability to the application.
   - Choose the event subscription or robot message receiving mode.
   - For Stream mode, start the local Stream gateway/server first so the SDK establishes a long connection to DingTalk.
   - After the long connection is online, return to DingTalk Open Platform and configure the subscribable events.

3. Implement the local service.
   - Prefer the official `dingtalk-stream` SDK for Stream mode.
   - Register robot callbacks for the SDK robot topic, normally `/v1.0/im/bot/messages/get` or the SDK constant such as `TOPIC_ROBOT`.
   - Acknowledge Stream callbacks quickly, then process business logic asynchronously.
   - Reply through the Stream `sessionWebhook` when the incoming robot message provides one; use the required DingTalk access token header.
   - Keep HTTP webhook endpoints only for compatibility or local debugging unless the user explicitly chooses HTTP mode.

4. Verify the connection before configuring events.
   - Start the service with the target AppKey/ClientID and AppSecret/ClientSecret.
   - Confirm it can obtain an access token.
   - Confirm it can obtain a Stream endpoint/ticket.
   - Confirm WebSocket connection succeeds.
   - Then configure or test event subscriptions in DingTalk Open Platform.

## Interactive Cards

Use interactive cards when a robot must send monitoring alerts, hourly reports, formatted operational messages, images, or long structured content. Do not assume ordinary `send-by-bot --text` can render long Markdown in robot single chats.

For the complete implementation recipe, API shape, and pitfalls from the refund-rate report integration, read [references/interactive-cards.md](references/interactive-cards.md).

Quick rules:

- Prefer robot interactive cards for long or formatted robot messages.
- Use ordinary robot text only for short one-line notifications.
- Treat card template IDs carefully: the normal robot card path usually uses `StandardCard`; a card-builder URL UUID is not automatically a sendable OpenAPI `cardTemplateId`.
- Put formatted body content inside a card `contents` item with `type: "markdown"`; a plain `type: "text"` item displays Markdown syntax as text.
- For card typography and spacing, use DingTalk markdown design tokens such as `sizeToken=common_h1_text_style__font_size` and visible spacer lines such as `&nbsp;`; plain heading markers, numeric `font size=...`, and empty lines may not render as intended.
- Validate with a small real card first, then send the full report or alert.

## Important Stream Setup Note

If DingTalk Open Platform reports:

`Stream模式接入失败,请参考Stream模式SDK接入指南`

First check whether the local Stream gateway/server is running and connected to DingTalk. This error commonly appears when the Open Platform tries to configure or detect subscribable events before any Stream SDK client has established the long connection. Do not assume the event topic or callback handler code is wrong until the gateway/server connection has been verified.

## Implementation Checks

When reviewing or changing a DingTalk Stream or robot service:

- Ensure environment variables map clearly:
  - `DINGTALK_CLIENT_ID`: enterprise internal app AppKey / ClientID.
  - `DINGTALK_CLIENT_SECRET`: enterprise internal app AppSecret / ClientSecret.
  - `DINGTALK_BOT_ID` or robot code: robot identifier used by robot send APIs.
- Ensure secrets are redacted in logs.
- Ensure the SDK subscription list includes the robot callback topic when using Stream mode.
- Ensure the service has a health endpoint if it is long-running.
- Ensure local port conflicts are handled by changing the local health-check port rather than changing DingTalk Stream configuration.
- On Windows, use the project's configured Node/npm paths when present.

## Validation

Before claiming the integration is working:

1. Run the project tests if available.
2. Start the service and verify the health endpoint.
3. Verify Stream connectivity with real credentials or a minimal SDK probe:
   - access token obtained
   - endpoint/ticket obtained
   - WebSocket connected
4. For cards and alerts, send a small real test card/message to the intended target before sending the full report.
5. If the user is configuring events in the Open Platform, keep the Stream service running while they save or test the subscription.

## Relationship To DWS

Use the DWS skill/CLI for DingTalk product operations such as reading documents, querying contacts, or managing DingTalk resources. Use this skill for the application/robot development workflow, Stream event subscription setup, and robust robot alert/card delivery.

If DWS message sending shows plain text, only a title, or split segments in DingTalk, switch to the interactive-card reference in this skill instead of trying more text formatting variants.
