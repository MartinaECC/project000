const tabs = Array.from(document.querySelectorAll(".tab-button"));
const panels = Array.from(document.querySelectorAll(".tab-panel"));

function activateTab(tabName) {
  tabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabName);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

tabs.forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});

document.querySelectorAll("[data-tab-jump]").forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tabJump));
});

const cases = [
  {
    category: "数据与经营",
    title: "退费率钉钉自动播报",
    desc: "DataFinder 取数、计算退费率、生成图片表格、钉钉群每小时播报、青龙定时调度。",
    value: "经营异常更早暴露，减少人工查数和整理报表时间。",
    docs: [{ label: "查看文档", href: "file:///E:/Workspace_codex/project000/docs/products/dingtalk-chart-broadcast.md", local: "钉钉图表播报产品文档.md" }, { label: "版本记录", href: "file:///E:/Workspace_codex/project000/docs/products/dingtalk-app-changelog.md", local: "dingtalk-app-changelog.md" }],
  },
  {
    category: "运营协作",
    title: "运营助手客户台账",
    desc: "钉钉 @小灰龙，解析客户、时间、动作，写入飞书客户项目台账，支持图文记录。",
    value: "客户动作实时沉淀，减少运营跟进遗漏。",
    docs: [{ label: "PRD", href: "file:///E:/KnowledgeBase/10-Projects/经营自动化与AI协作项目群/运营助手客户台账PRD.md", local: "运营助手客户台账PRD.md" }, { label: "产品记录", href: "file:///E:/Workspace_codex/project000/docs/products/customer-ledger-dingtalk-feishu.md", local: "customer-ledger-dingtalk-feishu.md" }],
  },
  {
    category: "项目组合",
    title: "经营自动化项目池",
    desc: "将钉钉 Agent、市场情报、客户反馈、运营系统、问问机器人、项目进度机器人拆成长期项目。",
    value: "把 AI 提效从零散需求变成持续推进的项目组合。",
    docs: [{ label: "项目群", href: "file:///E:/KnowledgeBase/10-Projects/经营自动化与AI协作项目群/README.md", local: "项目群 README.md" }, { label: "项目池", href: "file:///E:/KnowledgeBase/10-Projects/经营自动化与AI协作项目群/项目池.md", local: "项目池.md" }],
  },
  {
    category: "组织记忆",
    title: "AI 日报 / 周报 / 复盘",
    desc: "建立日报三段式、本地 KnowledgeBase、周报、运营复盘和汇报网页。",
    value: "把分散工作变成可回看、可复用的组织记忆。",
    docs: [{ label: "日报目录", href: "file:///E:/KnowledgeBase/40-Reviews/2026/日报", local: "日报目录" }, { label: "W25 周报", href: "file:///E:/KnowledgeBase/40-Reviews/2026/周报/AI周报%20-%202026-W25.md", local: "AI周报 - 2026-W25.md" }],
  },
  {
    category: "平台架构",
    title: "AI 知识库架构与 Agent 方案",
    desc: "明确 AI Context Platform、Knowledge MCP、权限、数仓 Tool、Hermes/OpenClaw PoC 思路。",
    value: "为下一步服务器和平台化建设提供技术框架。",
    docs: [{ label: "查看文档", href: "https://ocn4u1j6s1bk.feishu.cn/wiki/AftxwOpYSiJKlUkiN5rckHzynUb" }],
  },
  {
    category: "数据分析",
    title: "小赢渠道分析",
    desc: "输出分渠道新增金额与退费数量分析，识别新增收入渠道。",
    value: "快速支持经营判断和渠道复盘。",
    docs: [{ label: "分析报告", href: "file:///E:/Workspace_codex/project000/outputs/xiaoying-channel-report-20260623.md", local: "xiaoying-channel-report-20260623.md" }],
  },
  {
    category: "经营测算",
    title: "宜信退费率归因与补贴测算",
    desc: "完成退费率上升归因、补贴测算文档和本地测算页面。",
    value: "支持客户沟通、策略判断和投入产出评估。",
    docs: [{ label: "退费率归因", href: "https://ocn4u1j6s1bk.feishu.cn/docx/GmsvdQ1PqoEx5pxs2Bsc28jInph" }, { label: "补贴测算", href: "https://ocn4u1j6s1bk.feishu.cn/docx/ZcSXdVcRjokEM8xNJYrcodabngg" }, { label: "测算网页", href: "https://ocn4u1j6s1bk.aiforce.cloud/app/app_178xutxqpnz" }],
  },
  {
    category: "组织汇报",
    title: "AI 运营提效汇报网页",
    desc: "将 AI 提效、退费率播报、团队协作思路做成网页化汇报。",
    value: "便于向老板和团队展示阶段成果。",
    docs: [{ label: "汇报网页", href: "https://ocn4u1j6s1bk.aiforce.cloud/app/app_4kegf2ct8mem6" }, { label: "分享站点", href: "https://ocn4u1j6s1bk.aiforce.cloud/app/app_178xwdegtnj" }],
  },
  {
    category: "证据整理",
    title: "图片转 Excel",
    desc: "将截图/留言记录结构化为 Excel，并保留 inspect 校验文件。",
    value: "减少人工转录，提升投诉/证据整理效率。",
    docs: [{ label: "Excel", href: "file:///E:/Workspace_codex/project000/outputs/image_to_excel_20260624/图片转录留言记录.xlsx", local: "图片转录留言记录.xlsx" }, { label: "校验", href: "file:///E:/Workspace_codex/project000/outputs/image_to_excel_20260624/图片转录留言记录.xlsx.inspect.ndjson", local: "xlsx.inspect.ndjson" }],
  },
  {
    category: "客服核查",
    title: "鉴云短信日志核查",
    desc: "沉淀手机号短信日志查询 Skill、状态映射和敏感信息规则。",
    value: "提升投诉处理和证据核查效率。",
    docs: [{ label: "Skill 源码", href: "file:///E:/Workspace_codex/project000/.codex/skills/jianyun-sms-log/SKILL.md", local: "jianyun-sms-log/SKILL.md" }],
  },
  {
    category: "方法库",
    title: "数据分析与 SQL 方法库",
    desc: "建立数据源规范、指标口径、常用 SQL、避坑清单。",
    value: "降低后续经营分析从零补口径的成本。",
    docs: [{ label: "方法库", href: "file:///E:/KnowledgeBase/20-Areas/数据分析与SQL/README.md", local: "数据分析与SQL/README.md" }],
  },
  {
    category: "商务判断",
    title: "优鉴合作模式沉淀",
    desc: "梳理协议支付、绑卡后扣款、预付采购等合作模式和法审边界。",
    value: "支持方案评审、客户风险说明和商务判断。",
    docs: [{ label: "标准沉淀", href: "file:///E:/KnowledgeBase/10-Projects/优鉴报告项目/合作模式标准沉淀.md", local: "合作模式标准沉淀.md" }],
  },
  {
    category: "知识沉淀",
    title: "WeRead / 知识沉淀流程",
    desc: "建立读书笔记索引和可复用总结流程。",
    value: "把个人学习转成团队方法库。",
    docs: [{ label: "读书索引", href: "file:///E:/KnowledgeBase/30-Resources/读书笔记/读书笔记索引.md", local: "读书笔记索引.md" }, { label: "WeRead Skill", href: "file:///E:/Workspace_codex/project000/.codex/skills/weread-book-summary/SKILL.md", local: "weread-book-summary/SKILL.md" }],
  },
  {
    category: "样板仓库",
    title: "project000 样板仓库",
    desc: "沉淀机器人代码、脚本、skills、产品文档、测试和部署说明。",
    value: "让一次性能力可以交接、复跑、迭代。",
    docs: [{ label: "README", href: "file:///E:/Workspace_codex/project000/README.md", local: "project000 README.md" }, { label: "协作资产", href: "file:///E:/Workspace_codex/project000/docs/collaboration/README.md", local: "docs/collaboration/README.md" }],
  },
];

const caseGrid = document.querySelector("#caseGrid");
caseGrid.innerHTML = cases
  .map((item) => {
    const docs = item.docs
      .map((doc) => {
        if (doc.href.startsWith("https://")) {
          return `<a class="doc-button" href="${doc.href}" target="_blank" rel="noopener noreferrer">查看文档</a>`;
        }
        return `<a class="local-chip" href="${doc.href}" data-tip="${doc.local || doc.label}">${doc.label}</a>`;
      })
      .join("");
    return `
      <article class="case-card">
        <span class="case-category">${item.category}</span>
        <h3>${item.title}</h3>
        <p>${item.desc}</p>
        <div class="case-value">${item.value}</div>
        <div class="doc-actions">${docs}</div>
      </article>
    `;
  })
  .join("");

const techItems = [
  ["基础设施", "独立 Linux 服务器", "承载团队 Agent、钉钉机器人、定时任务、日志与知识库服务。"],
  ["基础设施", "环境隔离", "至少区分公共环境与敏感环境，公共团队 Agent 和敏感经营分析 Agent 使用不同凭证和数据源。"],
  ["算法中枢", "Agent 中枢 PoC", "用相同 3-5 个任务比较 Hermes Agent 与 OpenClaw 的准确率、稳定性、权限、渠道接入和 Token 成本。"],
  ["知识检索", "统一 AI Context Platform", "原始数据仍留在飞书、数仓、火山、客服等系统，向量库只做检索索引层。"],
  ["知识检索", "Knowledge MCP / Retrieval API", "统一处理检索、ACL、引用溯源和审计日志。"],
  ["数据接入", "飞书知识库优先", "飞书文档按结构切块；IM 先提炼决策、待办、故障和 Q&A。"],
  ["数据安全", "只读结果表和宽表", "AI 第一阶段只读安全视图，禁止直连生产主库，只允许 SELECT 并限制行数和时长。"],
  ["自动化", "迁移本地任务", "退费率播报、客户台账、失败补偿、健康检查统一在服务器运行。"],
  ["团队资产", "Skill 沉淀", "成熟 SQL/Python/分析流程写成团队可复用 Skill，包含输入参数、输出格式和人工复核要求。"],
  ["观测成本", "日志与 Token 统计", "后续接 Langfuse/Ragas 或自建管理台，评估成功率、错误率和调用成本。"],
];

const techAccordion = document.querySelector("#techAccordion");
techAccordion.innerHTML = techItems
  .map((item, index) => `
    <article class="accordion-item ${index === 0 ? "open" : ""}">
      <button class="accordion-button" type="button">
        <span>${item[1]}<small>${item[0]}</small></span>
      </button>
      <div class="accordion-detail">${item[2]}</div>
    </article>
  `)
  .join("");

document.querySelectorAll(".accordion-button").forEach((button) => {
  button.addEventListener("click", () => {
    button.closest(".accordion-item").classList.toggle("open");
  });
});
