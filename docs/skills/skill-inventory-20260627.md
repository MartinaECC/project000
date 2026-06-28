# Skill 盘点报告 - 2026-06-27

## 扫描范围

- `E:\Workspace_codex\project000\.codex\skills`
- `C:\Users\Administrator\.codex\skills`
- `C:\Users\Administrator\.agents\skills`
- `C:\Users\Administrator\.codex\plugins\cache`

## 总览

| 来源 | 数量 | 说明 |
| --- | ---: | --- |
| workspace | 13 | 当前仓库内的项目级 skill |
| user-codex | 4 | 用户级 Codex skill |
| agents | 30 | agents skill 目录，多为 Lark/DingTalk/内部系统能力 |
| system | 5 | Codex 系统内置 skill |
| plugin-cache | 127 | 插件缓存 skill，包含 bundled、curated、curated-remote、primary-runtime |
| 合计 | 179 | 按 `SKILL.md` 文件数统计 |

## 明确重复

这些是同名且内容 hash 完全一致的重复，可以视为真实重复安装。

| skill | 重复位置 | hash | 建议 |
| --- | --- | --- | --- |
| `dws` | `C:\Users\Administrator\.agents\skills\dws\SKILL.md`；`C:\Users\Administrator\.codex\skills\dws\SKILL.md` | `25F131A2E41E` | 保留一个来源即可。若主要由 Agents/DWS 环境维护，建议保留 `.agents`，移除或归档 `.codex\skills` 副本。 |
| `zentao` | `C:\Users\Administrator\.agents\skills\zentao\SKILL.md`；`E:\Workspace_codex\project000\.codex\skills\zentao\SKILL.md` | `4F9E76C8AE2F` | 如果 ZenTao 是所有项目都要用，建议保留 `.agents`；如果只服务 `project000`，保留 workspace 版。当前两份完全一致，长期会增加漂移风险。 |

## 同名但内容不同

这些不是完全重复，更像版本并存或职责相近。不要直接删除，先确认实际加载优先级。

| skill | 位置 | 差异判断 | 建议 |
| --- | --- | --- | --- |
| `pdf` | `C:\Users\Administrator\.codex\skills\pdf\SKILL.md`；`C:\Users\Administrator\.codex\plugins\cache\openai-primary-runtime\pdf\26.623.12021\skills\pdf\SKILL.md` | 同名不同 hash；一个是用户级，一个是 primary-runtime 插件版。 | 保留插件版作为默认运行时能力；用户级 `pdf` 只有在有本机特殊经验时才保留，否则建议改名为更具体的 `local-pdf-workflow` 或归档。 |
| Figma 系列 | `openai-curated-remote\figma\2.0.12` 与 `openai-curated\figma\9c1190e4` | 同名不同 hash，属于插件缓存多版本。 | 不建议手动删缓存；优先通过插件管理/更新机制处理。当前可视为缓存层重复，不是个人 skill 维护问题。 |

重复的 Figma skill 名称：

- `figma-code-connect`
- `figma-create-new-file`
- `figma-generate-design`
- `figma-generate-diagram`
- `figma-generate-library`
- `figma-use`
- `figma-use-figjam`
- `figma-use-slides`

## 项目级 skill

当前仓库内有 13 个项目级 skill：

- `ai-business-experiment`
- `ai-daily-report-feishu`
- `automation-reporting`
- `customer-ledger-dingtalk-feishu`
- `dingtalk-app-dev`
- `jianyun-sms-log`
- `operation-monthly-review-datafinder`
- `personal-company-copilot`
- `ppt-to-public-web`
- `qinglong-automation-deploy`
- `tencent-docs-openapi`
- `weread-book-summary`
- `zentao`

其中 `operation-monthly-review-datafinder` 存在于文件系统，但当前会话的可用 skill 列表里没有展示，可能是会话启动时未加载、命名/索引未刷新，或描述触发信息不完整。建议后续单独检查它的 `SKILL.md` frontmatter 和目录命名。

## 需要补强的 skill

| skill | 问题 | 建议 |
| --- | --- | --- |
| `tencent-docs-openapi` | description 仍是 TODO 模板。 | 补齐触发场景、输入形态、边界职责和验证方式，否则很难被正确触发。 |
| `operation-monthly-review-datafinder` | 文件存在但未出现在当前可用列表。 | 检查 frontmatter 是否规范、描述是否过长或缺失、是否需要重启/刷新 skill 索引。 |

## 建议处理顺序

1. 先处理完全重复：`dws`、`zentao`。
2. 再决定用户级 `pdf` 是否真的需要；如果只是旧版本地经验，建议改名或归档，避免和 runtime `pdf` 混淆。
3. 修 `tencent-docs-openapi` 的 TODO 描述。
4. 检查 `operation-monthly-review-datafinder` 为什么未进入当前可用 skill 列表。
5. 插件缓存里的 Figma 多版本先不手动删除，除非确认插件管理器没有自动清理能力。

## 本次扫描命令摘要

```powershell
Get-ChildItem -Path `
  'E:\Workspace_codex\project000\.codex\skills',`
  'C:\Users\Administrator\.codex\skills',`
  'C:\Users\Administrator\.agents\skills',`
  'C:\Users\Administrator\.codex\plugins\cache' `
  -Recurse -Filter SKILL.md -ErrorAction SilentlyContinue
```

重复判断基于目录名作为 skill 名称，并用 `Get-FileHash -Algorithm SHA256` 判断内容是否完全一致。
