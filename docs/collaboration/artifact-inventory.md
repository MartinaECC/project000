# 工作区成果清单

这份清单记录当前工作区中已经形成的代码、脚本、skill 和展示材料，并标注本轮是否建议入库。

| 成果 | 用途 | 路径 | 本轮入库 | 风险备注 | 后续动作 |
| --- | --- | --- | --- | --- | --- |
| 钉钉智能机器人底座 | 接收 DingTalk Stream 机器人消息，调用 LLM 生成回复，并通过钉钉返回。 | `src/`、`test/`、`package.json`、`package-lock.json` | 是 | 需要通过 `.env` 注入真实应用配置；源码不包含真实密钥。 | 后续按岗位任务扩展更多意图和工具。 |
| 群聊总结助手雏形 | 识别“总结今天/本周群聊”等请求，读取群消息并生成总结。 | `src/intent-router.ts`、`src/tool-registry.ts`、`test/intent-router.test.ts`、`test/dws-adapters.test.ts` | 是 | 依赖 DWS 登录态和群聊权限；运行时需要白名单控制。 | 从真实岗位任务中确认第一个可上线场景。 |
| 退款率报告脚本和服务 | 从 DataFinder 查询收入、退款数据，生成退款率报告，并在异常时调用 LLM 解释。 | `src/refund-report.ts`、`scripts/datafinder_refund_report.py`、`test/refund-report.test.ts` | 是 | 真实 DataFinder 凭据必须通过环境变量传入。 | 增加实际运行说明和调度策略。 |
| 月度客户复盘能力 | 计算自然月指标、环比变化，并生成复盘初稿或查询计划。 | `src/monthly-review.ts`、`scripts/monthly_review_datafinder.py`、`scripts/generate_monthly_review_xml.py`、`test/monthly-review.test.ts` | 是 | 已移除固定文档 token，目标文档通过 `MONTHLY_REVIEW_DOC_TOKEN` 配置。 | 修复历史中文编码，补齐指标字典。 |
| PDF 文档抽取脚本 | 将本地 PDF 手册抽取为文本，便于总结和知识库整理。 | `scripts/extract_qiyu_pdfs.py` | 是 | 不提交抽取后的临时文本和原始业务资料。 | 后续接入知识库整理流程。 |
| 腾讯文档 OpenAPI skill | 通过官方 OpenAPI 做鉴权、文件、表格、文档和智能表操作。 | `skills/tencent-docs-openapi/` | 是 | 文档只包含占位符和官方端点，不保存 token。 | 后续按实际腾讯文档场景补充脚本示例。 |
| AI 月度复盘展示页 | 展示 AI 辅助月度复盘的流程、角色协作和推进节奏。 | `ai-monthly-review-site/` | 是 | 静态展示页，不含业务数据或密钥。 | 后续可作为内部说明页继续完善。 |
| 月度复盘 XML/JSON 产物 | 已生成的客户复盘结果和数据快照。 | `*_review.xml`、`*_data.json`、`ai_monthly_review_project.xml` | 否 | 可能包含客户数据或阶段性业务结果。 | 如需入库，先脱敏并放入专门样例目录。 |
