# Skill 总览

这份文档是 `project000` 的项目级 skill 管理入口，用来快速了解当前项目安装了哪些 skill、哪个目录是生效版本、适合什么场景，以及后续维护时要注意什么。

## 目录约定

- `.codex/skills/`：当前 Codex 运行时优先发现和使用的项目 skill 目录。
- `skills/`：历史、草稿或迁移待确认的 skill 资产目录。这里的内容不默认视为当前生效版本。
- 各 skill 的完整执行细节仍维护在对应 `SKILL.md` 中；本页只记录索引、状态和管理信息。

## 当前 Skill 清单

| Skill 名称 | 状态 | 路径 | 适用场景 | 关键依赖 | 维护备注 |
| --- | --- | --- | --- | --- | --- |
| `ai-daily-report-feishu` | 可用 | `.codex/skills/ai-daily-report-feishu/` | 生成 Codex 今日工作总结，写入飞书 AI 日报文档，并回填上级 Base 记录。 | 飞书/Lark CLI、用户身份授权、目标 wiki/doc/base 权限。 | 已沉淀为日常复用流程；维护时保持同日复用与回填校验规则。 |
| `dingtalk-app-dev` | 可用 | `.codex/skills/dingtalk-app-dev/` | 创建和维护钉钉企业内部应用、机器人、Stream 事件订阅和互动卡片。 | DingTalk/DWS CLI、钉钉开放平台应用配置、机器人 AppKey/AppSecret、必要事件权限。 | 包含互动卡片与本地 Windows 主机经验；新增机器人能力时优先补充 reference。 |
| `operation-monthly-review-datafinder` | 可用 | `.codex/skills/operation-monthly-review-datafinder/` | 基于火山 DataFinder 指标生成企业自然月运营复盘草稿。 | Volcano Engine DataFinder 凭据、企业简称、目标月份、飞书目标文档权限。 | 作为运营复盘子 skill 使用；缺失业务背景时应标记待确认。 |
| `tencent-docs-openapi` | 待完善 | `.codex/skills/tencent-docs-openapi/` | 通过腾讯文档官方 OpenAPI 处理授权、文件、表格、文档和智能表相关操作。 | 腾讯文档 OpenAPI 应用、OAuth 或应用 token、目标文件权限。 | 当前 `.codex` 版本仍含模板 TODO，需要补齐描述、流程和参考资料后再标为可用。 |
| `weread-book-summary` | 可用 | `.codex/skills/weread-book-summary/` | 基于微信读书链接和用户授权浏览器状态生成读书总结、章节总结、行动清单或团队手册。 | Chrome 登录态、微信读书会员/可见内容权限、浏览器控制能力。 | 只能使用用户已授权可见内容，不绕过付费墙、DRM 或登录限制。 |
| `zentao` | 可用 | `.codex/skills/zentao/` | 访问内部禅道实例，查询产品、计划、需求、Bug、执行或调用 REST API。 | 内部网络、`ZENTAO_TOKEN` 环境变量、禅道 API 权限。 | 使用 REST API 优先；PowerShell 中调用接口时优先使用 `curl.exe`。 |
| `tencent-docs-openapi` | 历史/待确认 | `skills/tencent-docs-openapi/` | 腾讯文档 OpenAPI skill 的早期或备用版本。 | 腾讯文档 OpenAPI 应用、OAuth 或应用 token。 | 与 `.codex/skills/tencent-docs-openapi/` 同名；当前不视为运行时生效版本，后续需要确认是否迁移、合并或删除。 |

## 候选/待评估 Skill

| Skill 名称 | 状态 | 来源 | 适用场景 | 关键依赖 | 维护备注 |
| --- | --- | --- | --- | --- | --- |
| `anysearch` | 候选/待评估 | <https://github.com/anysearch-ai/anysearch-skill> | 公开网页搜索、垂直领域搜索、批量搜索、URL 内容抽取。 | 外部 AnySearch API、可选 `ANYSEARCH_API_KEY`、Python/Node.js/PowerShell/Bash 运行时。 | 暂不安装到 `.codex/skills/`，不配置 API key，不写入 `.env`；只能用于公开信息检索，涉及内部资料、客户信息、密钥、账号或未公开业务内容时不使用。 |

候选 skill 不视为当前生效版本。后续如需安装，应先固定 release 版本、检查脚本内容、运行自带 `doc` 命令确认本机推荐 runtime，并补充安全评估记录。

## 维护规则

- 每新增、迁移、删除一个 skill，都同步更新本页。
- 如果 `.codex/skills/` 和 `skills/` 出现同名 skill，必须在清单里明确哪个是当前生效版本。
- 总览只写“何时用、是否可用、依赖什么、维护状态”；执行步骤、命令、异常处理和安全要求写回对应 `SKILL.md`。
- 不要在本页或 skill 文件中写入 token、账号密码、二维码、真实业务密钥或可恢复的敏感凭据。
