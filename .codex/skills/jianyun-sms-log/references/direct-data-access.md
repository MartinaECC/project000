# Direct Data Access Extension

This reference is a placeholder for future direct database access to Jianyun SMS logs.

## Current Status

No direct database connection, table name, credentials, or schema has been confirmed. Do not guess production table names or credentials. Use browser login plus `/admin-api/system/sms-log/page` until direct read-only database access is explicitly provided and verified.

## Expected Capability

When direct data access is available, implement the same logical query as the API workflow:

- filter by `mobile`,
- filter by send time range,
- return all matching rows,
- join or map SMS channel metadata,
- preserve retry relationship,
- map send/receive/template statuses to the same Chinese labels used by the Jianyun page,
- export with the standard columns.

## Schema Discovery Checklist

Before querying real data:

1. Confirm environment and permission are read-only.
2. Identify the SMS log table and SMS channel table from metadata, not by guesswork.
3. Confirm timestamp columns and timezone. The browser/API values in current usage display as Asia/Shanghai.
4. Confirm enum values for send status, receive status, template type, channel code, and retry relationship.
5. Run one known phone-number comparison against the browser/API output to validate row counts and field meanings.

## Candidate Field Mapping From API

The API currently returns fields that likely correspond to table columns:

```text
id
channelId
channelCode
templateId
templateCode
templateType
templateContent
mobile
userId
retryId
userType
sendStatus
sendTime
apiSendCode
apiSendMsg
apiRequestId
apiSerialNo
receiveStatus
receiveTime
apiReceiveCode
apiReceiveMsg
createTime
channel
```

Do not treat this as confirmed database schema. Use it only as a comparison target after schema discovery.
