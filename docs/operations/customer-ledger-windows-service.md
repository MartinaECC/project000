# 运营助手客户台账 Windows 常驻服务部署

本文用于第一阶段“固定办公室电脑服务”部署，让小灰龙客户台账能力不依赖个人电脑是否开着。

产品约定、使用方式和真实验证记录见：[运营助手客户台账记录](../products/customer-ledger-dingtalk-feishu.md)。

## 目标拓扑

```text
钉钉 @小灰龙-运营助手
  -> DingTalk Stream
  -> 固定办公室电脑 Windows 服务
  -> JSONL 暂存 D:\OpsAssistant\data\customer-ledger
  -> 飞书 Wiki 客户项目台账
```

## 目录约定

```text
D:\OpsAssistant\project000              # 项目代码
D:\OpsAssistant\data\customer-ledger    # 客户台账 JSONL
D:\OpsAssistant\data\intake             # 普通工作碎片 JSONL
D:\OpsAssistant\logs                    # 服务日志
D:\nodejs24                             # Node.js 24
C:\nssm\nssm.exe                        # NSSM
```

## 部署步骤

1. 在固定办公室电脑安装 Node.js 24、`lark-cli`、`dws`、NSSM。
2. 将项目复制或拉取到 `D:\OpsAssistant\project000`。
3. 复制 `deploy\windows\.env.intake.service.example` 为 `D:\OpsAssistant\project000\.env.intake.local`。
4. 填入真实密钥和试点白名单：
   - `DINGTALK_CLIENT_ID=dingxuuuvqzncyx1o6wp`
   - `DINGTALK_BOT_ID=dingxuuuvqzncyx1o6wp`
   - `CUSTOMER_LEDGER_LARK_CLI_BIN=C:\Users\Administrator\AppData\Roaming\npm\lark-cli.cmd`
   - `DINGTALK_ALLOWED_CONVERSATION_IDS=允许试点的群conversationId`
   - `DINGTALK_ALLOWED_USER_IDS=第一批3到5人的senderStaffId`

权限策略：

- 仅个人试点：配置 `DINGTALK_ALLOWED_USER_IDS`，`DINGTALK_ALLOWED_CONVERSATION_IDS` 可留空或配置试点群。
- 群内全员可用：配置 `DINGTALK_ALLOWED_CONVERSATION_IDS`，并将 `DINGTALK_ALLOWED_USER_IDS` 留空。
- 不建议两个白名单都留空，否则机器人会在所有收到消息的会话里响应。

当前 `增长运营组` 已按“群内全员可用”配置：

```text
DINGTALK_ALLOWED_CONVERSATION_IDS=cidFAOgAztoZGdUmkfl60XKXA==
DINGTALK_ALLOWED_USER_IDS=
```

长期服务建议把 `CUSTOMER_LEDGER_LARK_CLI_BIN` 配成 `lark-cli.cmd` 的绝对路径。任务计划程序或 Windows 服务启动时不一定继承当前终端的 `PATH`，只写 `lark-cli.cmd` 可能导致飞书同步失败。
5. 安装 Windows 服务：

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\windows\install-customer-ledger-service.ps1 `
  -ProjectRoot "D:\OpsAssistant\project000" `
  -NodePath "D:\nodejs24\node.exe" `
  -NssmPath "C:\nssm\nssm.exe" `
  -LogDir "D:\OpsAssistant\logs"
```

如果暂时没有 NSSM，可以先用 Windows 任务计划程序：

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\windows\register-customer-ledger-scheduled-task.ps1 `
  -ProjectRoot "E:\Workspace_codex\project000" `
  -NodePath "D:\nodejs24\node.exe" `
  -LogDir "E:\Workspace_codex\project000\logs" `
  -StartNow
```

任务计划程序方案适合作为当前电脑的过渡方案。它会在开机/登录时启动，异常退出后按 1 分钟间隔重试；如果要做到无人登录也能稳定运行，后续仍建议换 NSSM 或云服务器/容器。

6. 发送一条测试消息：

```text
@小灰龙-运营助手 京东金融 今天15:30 试点服务登记测试
```

7. 检查日志和飞书写入：

```powershell
Get-Content D:\OpsAssistant\logs\ecocc-intake.out.log -Tail 80
```

## 健康检查

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\windows\customer-ledger-health.ps1 `
  -ProjectRoot "D:\OpsAssistant\project000" `
  -LogDir "D:\OpsAssistant\logs"
```

建议用任务计划程序每 5 分钟运行一次；返回非 0 时通知维护人。

## 失败补偿

先 dry-run：

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\windows\customer-ledger-replay.ps1 `
  -ProjectRoot "D:\OpsAssistant\project000" `
  -DryRun
```

确认候选记录后执行：

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\windows\customer-ledger-replay.ps1 `
  -ProjectRoot "D:\OpsAssistant\project000"
```

## 试点使用说明

推荐格式：

```text
@小灰龙-运营助手 客户 今天15:30 做了什么动作
@小灰龙-运营助手 记台账：客户 26日 做了什么动作
```

图文登记：

- 支持把图片和登记文字放在同一条钉钉消息里发送，例如 `@小灰龙-运营助手 京东金融 今天15:30 已同步客户截图` 后面附图。
- 推荐团队成员使用 `记台账：客户 日期 内容`；日期支持 `今天`、`今日`、`260626`、`6.26`、`6月26日`、`26日`。
- 文字部分仍用于识别客户、日期和动作；图片会写入同一行台账的“内容”单元格，紧跟在文字后面。
- 纯图片消息暂不登记，因为缺少客户、日期和动作。
- 如果钉钉事件返回 `downloadCode` / `pictureDownloadCode`，服务会调用钉钉 `robot/messageFiles/download` 换取临时图片 URL，再写入飞书台账。
- 如果下载码过期或钉钉媒体接口失败，服务会先暂存记录并回复“图片下载失败”，需要重新发送同一条图文登记。

可登记：

- 客户运营动作
- 项目进展
- 上线或配置变更
- 需要后续跟进的客户事实

不要登记：

- 密码、密钥、二维码、合同敏感条款
- 未确认的客户承诺
- 财务、法务、合规结论
- 客户原始敏感信息

## 试点验收

- 3-5 名试点成员均能成功登记。
- 至少 3 个客户文档写入成功。
- 服务连续 7 天不依赖个人电脑运行。
- failed/pending 记录可通过补偿脚本处理。

## 当前真实验证记录

验证日期：2026-06-26。

- `#CL-20260626-010`：图文登记成功，图片进入飞书台账；该条为旧布局，图片位于最右侧 `文档` 列。
- `#CL-20260626-011`：图文登记成功，图片位于 `内容` 单元格并紧跟文字之后。
- 目标文档：`005 宜享花｜项目台账`。
- 飞书回读 revision：`951`。
- 自动化测试：`D:\nodejs24\npm.cmd test`，结果 `120 pass / 0 fail`。

已知测试残留：

- 早期调试产生过一条图片 token 混入正文的旧行。
- 旧布局产生过一条图片位于 `文档` 列的旧行。
- 这些历史行不会影响后续登记，可人工删除或后续实现清理脚本。
