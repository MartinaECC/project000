---
name: zentao
description: Use when Codex needs to access the internal ZenTao instance at 172.18.0.62, list or inspect products, product plans, stories, bugs, executions, or call ZenTao REST APIs.
---

# ZenTao

## Overview

Use the internal ZenTao REST API instead of scraping pages whenever the user asks for ZenTao data. The local instance is `http://172.18.0.62`.

## Authentication

Read the ZenTao session token from the `ZENTAO_TOKEN` environment variable and pass it with the `Token` request header. Do not use `Authorization: Bearer`; this ZenTao instance returns `Unauthorized` for that form.

```powershell
curl.exe -s "http://172.18.0.62/api.php/v1/products/2/plans?limit=200" -H "Token: $env:ZENTAO_TOKEN"
```

In PowerShell, prefer `curl.exe` rather than `curl`, because `curl` is often an alias for `Invoke-WebRequest`.

If `ZENTAO_TOKEN` is missing or empty, stop and send the user this exact PowerShell template:

```powershell
$body = @{
  account = "xiangyq"
  password = "你的禅道密码"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://172.18.0.62/api.php/v1/tokens" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

After the user provides or sets a token, continue with the API request. Do not print tokens in final answers or command summaries.

## Common Calls

Product `2` is Jianyun, shown in the UI as the product whose Chinese name is pronounced "Jianyun".

| Task | Method and path |
| --- | --- |
| List plans for Jianyun | `GET /api.php/v1/products/2/plans?limit=200` |
| List products | `GET /api.php/v1/products?limit=200` |
| Get a plan | `GET /api.php/v1/productplans/{planID}` |
| List stories for a product | `GET /api.php/v1/products/{productID}/stories?limit=200` |
| List bugs for a product | `GET /api.php/v1/products/{productID}/bugs?limit=200` |

When an endpoint path is uncertain, first try the obvious ZenTao REST path with `curl.exe -i` and inspect the JSON error/status. Keep requests read-only unless the user explicitly asks for a write action.

## Output Guidance

Parse JSON and present concise tables or summaries in Chinese when the user asks in Chinese. Translate common statuses as "not started", "in progress", "done", and "closed" respectively:

| API status | Chinese |
| --- | --- |
| `wait` | not started |
| `doing` | in progress |
| `done` | done |
| `closed` | closed |

If an item has `expired: true`, append the Chinese equivalent of "expired" to the status. Hide tokens in final answers and command summaries.
