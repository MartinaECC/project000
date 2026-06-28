import { useMemo, useState } from "react";
import "./styles.css";

const navGroups = [
  {
    title: "本周概览",
    items: [{ id: "overview", label: "执行摘要" }],
  },
  {
    title: "合作项目进展",
    items: [
      { id: "dashboard", label: "数据大盘" },
      { id: "month", label: "6月收益" },
      { id: "complaints", label: "客诉表现" },
      { id: "clients", label: "客户明细" },
      { id: "matrix", label: "客户矩阵" },
    ],
  },
  {
    title: "提效项目进展",
    items: [
      { id: "aiops", label: "AI智能运营" },
      { id: "service", label: "AI智能客服" },
    ],
  },
  {
    title: "新产品方向探索",
    items: [
      { id: "new-products", label: "新方向" },
      { id: "next", label: "下周重点" },
    ],
  },
];

const overviewRows = [
  {
    area: "合作项目",
    progress:
      "新橙 E 贷代码已上线；奇富支付/退费能力切换上线并计划灰度；宜信继续放量；你我贷、好分期、星城惠选、小赢等项目继续推进。",
    risk:
      "宜信退费率下个月起会影响量级；新生支付限制影响新橙 E 贷、星城惠选、悦贷宝、薇钱包等上线节奏；京信查客诉 PPM 较高。",
    next:
      "推动奇富灰度验收；跟进宜信退费压降方案与补贴 ROI；处理支付通道替换；按客户优先级做数据与风险跟进。",
  },
  {
    area: "提效项目",
    progress:
      "运营 AI 提效已跑通退费率自动播报、客户台账、AI 日报周报、渠道/退费归因分析、图片转 Excel、短信日志核查等真实场景。",
    risk:
      "当前能力仍偏个人电脑和临时脚本，需要迁移到稳定运行环境；AI 智能客服供应商还在测评、比价流程中",
    next:
      "推进独立服务器承载；沉淀团队可复用的播报、复盘、询问和工单跟进能力；继续推进客服供应商方案。",
  },
  {
    area: "新方向探索",
    progress:
      "AuraGarden 方向完成初步商业计划；金融情绪关怀报告进入立项设计。",
    risk: "新产品方向仍处于概念验证阶段，需要验证目标人群、转化链路和合规边界。",
    next:
      "金融情绪关怀报告明确被拒客群的情绪需求；AuraGarden 完善 MVP 路径、内容体系与跨境履约方案。",
  },
];

const auraPlanUrl = "https://ocn4u1j6s1bk.feishu.cn/wiki/LZiZwNEAUiolcykgAvWc3KWknjg?from=from_copylink";
const auraDemoUrl = "https://miaoda.feishu.cn/app/app_178yx8tregx";

const dashboardRows = [
  ["退费后收入", "5387.1 万", "1392.5 万", "-11.9%", "down", "整体收入较上周回落，主要客户仍集中在宜信、奇富数科。"],
  ["订单金额", "6779.6 万", "1775.2 万", "-12.0%", "down", "订单规模与退费后收入同步下降。"],
  ["总退费金额", "1392.5 万", "382.7 万", "-12.5%", "good", "退费金额随订单规模下降，降幅略大于订单金额。"],
  ["总退费率", "20.5%", "21.6%", "-0.1pp", "good", "整体退费率基本持平，结构上续费退费率有抬升。"],
  ["总订单数", "118.5 万", "31.9 万", "-10.3%", "down", "订单量下降幅度小于收入下降幅度，需关注客单价和客户结构变化。"],
  ["T0 报告查看率", "4.8%", "4.6%", "基本持平", "flat", "总体查看率稳定，但不同客户之间差异较大。"],
  ["主动支付金额", "2656.6 万", "628.3 万", "-23.4%", "down", "主动支付端下降明显，是本周收入回落的重要结构因素。"],
  ["续费支付金额", "4122.9 万", "1147.0 万", "-4.2%", "down", "续费相对稳定，但续费退费率从 13.1% 升至 14.5%。"],
];

const monthlyRows = [
  ["宜信", "1787.0 万", "1360.0 万", "+31.4%", "up", "核心收入项目，需结合退费率与客诉继续跟踪。"],
  ["奇富数科", "1739.9 万", "1913.4 万", "-9.1%", "down", "核心收入项目，需结合退费率与客诉继续跟踪。"],
  ["融呗", "376.8 万", "385.5 万", "-2.3%", "down", "收入规模较高但较上月回落，需关注量级或转化变化。"],
  ["本善花花卡", "267.1 万", "156.1 万", "+71.1%", "up", "收入规模较高且同比增长，建议保持放量观察。"],
  ["京信查", "249.8 万", "73.2 万", "+241.2%", "up", "收入规模较高且同比增长，建议保持放量观察。"],
  ["你我贷", "197.5 万", "149.2 万", "+32.4%", "up", "收入规模较高且同比增长，建议保持放量观察。"],
  ["还呗", "196.0 万", "115.1 万", "+70.3%", "up", "收入规模较高且同比增长，建议保持放量观察。"],
  ["用钱花", "156.9 万", "99.3 万", "+58.1%", "up", "收入规模较高且同比增长，建议保持放量观察。"],
  ["悦贷宝", "133.6 万", "3.0 万", "+4412.9%", "up", "收入规模较高且同比增长，建议保持放量观察。"],
  ["好分期", "125.6 万", "79.2 万", "+58.6%", "up", "收入规模较高且同比增长，建议保持放量观察。"],
  ["惠花钱包", "46.6 万", "10.6 万", "+340.7%", "up", "收入增长，继续观察转化和客诉。"],
  ["刷宝", "23.1 万", "6.3 万", "+265.6%", "up", "收入增长，继续观察转化和客诉。"],
  ["喜心花", "6.5 万", "10.8 万", "-39.4%", "down", "收入回落，建议看是否为投放、通道或客户结构变化。"],
  ["数智龟", "6.1 万", "5.1 万", "+20.5%", "up", "收入增长，继续观察转化和客诉。"],
  ["薇钱包", "5.8 万", "0", "上月为 0，本月新增", "up", "本月新增收入项目，建议观察是否可持续。"],
  ["维信金科", "3.1 万", "1.4 万", "+128.7%", "up", "收入增长，继续观察转化和客诉。"],
  ["优数智汇", "1.6 万", "2.3 万", "-31.1%", "down", "收入回落，建议看是否为投放、通道或客户结构变化。"],
  ["小赢科技", "1.1 万", "6209", "+84.4%", "up", "收入增长，继续观察转化和客诉。"],
  ["我来数科", "6304", "6783", "-7.1%", "down", "收入回落，建议看是否为投放、通道或客户结构变化。"],
  ["乐享借", "2194", "0", "上月为 0，本月新增", "up", "本月新增收入项目，建议观察是否可持续。"],
  ["人品科技", "2164", "1794", "+20.6%", "up", "收入增长，继续观察转化和客诉。"],
  ["玖富万卡", "2053", "508.4", "+303.8%", "up", "收入增长，继续观察转化和客诉。"],
  ["云盛花", "877.8", "1476", "-40.5%", "down", "收入回落，建议看是否为投放、通道或客户结构变化。"],
  ["众利", "478.8", "1676", "-71.4%", "down", "收入回落，建议看是否为投放、通道或客户结构变化。"],
  ["玮雅信息(桃多多)", "438.9", "199.5", "+120.0%", "up", "收入增长，继续观察转化和客诉。"],
  ["消费保", "79.8", "0", "上月为 0，本月新增", "up", "本月新增收入项目，建议观察是否可持续。"],
  ["中国妇联", "0.02", "0", "上月为 0，本月新增", "up", "本月新增收入项目，建议观察是否可持续。"],
  ["优小钱", "0", "0", "无收入", "flat", "暂无明显收入贡献，保留在全量项目清单中。"],
  ["恒昌", "0", "159.6", "-100.0%", "down", "本月暂无退费后收入，需确认是否暂停或未放量。"],
  ["张江公证处", "0", "0", "无收入", "flat", "暂无明显收入贡献，保留在全量项目清单中。"],
  ["嘉盈（招广）", "0", "0", "无收入", "flat", "暂无明显收入贡献，保留在全量项目清单中。"],
  ["优鉴测试企业", "0", "0", "无收入", "flat", "暂无明显收入贡献，保留在全量项目清单中。"],
  ["聘才猫", "0", "0", "无收入", "flat", "暂无明显收入贡献，保留在全量项目清单中。"],
  ["深圳优钱科技有限公司", "0", "0", "无收入", "flat", "暂无明显收入贡献，保留在全量项目清单中。"],
  ["锘陨趣记花", "-29.9", "59.8", "-150.0%", "down", "本月退费后收入为负，需核查退款或历史订单影响。"],
  ["测试（保留）", "-79.8", "0.02", "-398850.0%", "down", "本月退费后收入为负，需核查退款或历史订单影响。"],
];

const complaintTotals = [
  ["总客诉量", "399", "-20.2%", "good", "整体客诉下降。"],
  ["总客诉人数", "396", "-20.2%", "good", "客诉人数与客诉量同步下降。"],
  ["客诉占订单 PPM", "1251.8", "-", "flat", "每百万订单约 1252 件客诉。"],
  ["客服渠道客诉", "140", "-3.4%", "good", "客服渠道小幅下降。"],
  ["监管平台客诉", "40", "+8.1%", "down", "监管侧客诉反向上升，需要重点关注。"],
  ["舆论平台客诉", "216", "-31.4%", "good", "舆论平台投诉下降明显。"],
];

const complaintClients = [
  ["京信查", 120, 119, 30238, 3968.5, "客诉强度最高，需列为治理重点。"],
  ["宜信", 102, 102, 107216, 951.4, "客诉绝对量高，叠加退费率压力量级风险。"],
  ["奇富数科", 60, 59, 92474, 648.8, "核心客户客诉可控，但仍需关注轮次递减用户。"],
  ["融呗", 57, 57, 28667, 1988.3, "客诉强度偏高，建议纳入下周跟踪。"],
  ["本善花花卡", 22, 22, 9086, 2421.3, "绝对量不高但 PPM 偏高。"],
];

const matrixItems = [
  {
    quadrant: "高影响 / 高紧急",
    clients: "宜信、奇富数科",
    status: "high",
    note: "核心收入客户，宜信退费率压力上升，奇富进入支付/退费能力灰度前关键节点。",
    action: "宜信优先压降退费率并评估补贴 ROI；奇富优先完成灰度验收和个性化推荐方案确认。",
    x: 76,
    y: 24,
  },
  {
    quadrant: "高影响 / 中紧急",
    clients: "京信查、你我贷、还呗、好分期",
    status: "medium",
    note: "月度收入增长明显；京信查客诉 PPM 高，你我贷新增入口后增长。",
    action: "京信查重点客诉治理；你我贷对齐签约前置方案；好分期推动押金和主体切换。",
    x: 70,
    y: 58,
  },
  {
    quadrant: "中影响 / 高紧急",
    clients: "星城惠选、悦贷宝、薇钱包、新橙 E 贷",
    status: "medium",
    note: "上线/扣款恢复受支付通道影响明显，尤其新生支付限制权益业务。",
    action: "快速确认可替代通道并更新排期；同步法务、产品和客户侧口径。",
    x: 37,
    y: 25,
  },
  {
    quadrant: "孵化观察",
    clients: "小赢科技、数智龟、玖富/万卡、杭州盈盈等",
    status: "low",
    note: "部分客户有增长信号或明确推进事项，但当前规模较小或仍在接入/尽调/商务阶段。",
    action: "以里程碑推进为主，保留数据观察和关键卡点跟进。",
    x: 34,
    y: 68,
  },
];

const clients = [
  {
    name: "宜信 / 宜享花",
    impact: "高",
    urgency: "高",
    risk: "高",
    revenue: "531.4 万",
    month: "1787.0 万",
    data: "6.20-6.26退费后收入531.4万元（环比上周-6.1%），日均退费后收入75.9万元（环比上周-6.1%），本周退费率20.9%（环比上周-0.8pp），六月退费后收入1787.0万元（环比上月同期+31.4%）。",
    progress: "本月继续放量，主动放量约 600 万；已完成退费归因分析，主要原因来自唤醒客群、触达率上升、新增客群风险更高、补贴暂停这四个因素。并推进退费补贴 ROI 测算。",
    risks: "退费率从 12% 增至 19%，客户明确表示若无法压降后续会降低量级。",
    actions: "推进退费率压降与补贴 ROI 决策，补充补贴上线/关闭时间点台账。",
  },
  {
    name: "奇富数科",
    impact: "高",
    urgency: "高",
    risk: "中",
    revenue: "417.7 万",
    month: "1739.9 万",
    data: "6.20-6.26退费后收入417.7万元（环比上周-12.6%），日均退费后收入59.7万元（环比上周-12.6%），本周退费率12.3%（环比上周+1.4pp），六月退费后收入1739.9万元（环比上月同期-9.1%）。",
    progress: "支付/退费能力切换上线，计划下周一灰度验收；个性化推荐完成技术评审并调整文档。",
    risks: "166 笔轮次递减用户的退费/客诉仍需持续跟踪。",
    actions: "确认客群标签与内容模块映射关系，完成灰度验收。",
  },
  {
    name: "融呗",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "103.2 万",
    month: "376.8 万",
    data: "6.20-6.26退费后收入103.2万元（环比上周-20.5%），日均退费后收入14.7万元（环比上周-20.5%），本周退费率47.6%（环比上周+5.1pp），六月退费后收入376.8万元（环比上月同期-2.3%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "本善花花卡",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "36.7 万",
    month: "267.1 万",
    data: "6.20-6.26退费后收入36.7万元（环比上周-59.3%），日均退费后收入5.2万元（环比上周-59.3%），本周退费率39.1%（环比上周+5.8pp），六月退费后收入267.1万元（环比上月同期+71.1%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "京东金融",
    impact: "高",
    urgency: "中",
    risk: "中",
    revenue: "86.7 万",
    month: "249.8 万",
    data: "6.20-6.26退费后收入86.7万元（环比上周-4.5%），日均退费后收入12.4万元（环比上周-4.5%），本周退费率16.6%（环比上周+2.4pp），六月退费后收入249.8万元（环比上月同期+241.2%）。",
    progress: "1503 价格测试已出结论，39.9 元支付转化明显优于 49.9 元，已切回 39.9 元。",
    risks: "客诉强度偏高，需继续降低客诉外溢。26已经正式上线客服直接转我司的功能",
    actions: "关注客诉、市场部投放位置的情况",
  },
  {
    name: "你我贷",
    impact: "高",
    urgency: "中",
    risk: "中",
    revenue: "59.7 万",
    month: "197.5 万",
    data: "6.20-6.26退费后收入59.7万元（环比上周+19.3%），日均退费后收入8.5万元（环比上周+19.3%），本周退费率10.6%（环比上周+1.2pp），六月退费后收入197.5万元（环比上月同期+32.4%）。",
    progress: "新增中收页两个入口，共 6 个渠道配置，客户侧已开量。",
    risks: "当前 H5 协议支付先支付后签约，且出现同时间多笔扣款问题。",
    actions: "与客户对齐是否改为签约前置，以支持 M0 补扣和周期扣款。",
  },
  {
    name: "还呗",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "56.5 万",
    month: "196.0 万",
    data: "6.20-6.26退费后收入56.5万元（环比上周-1.4%），日均退费后收入8.1万元（环比上周-1.4%），本周退费率11.6%（环比上周+0.5pp），六月退费后收入196.0万元（环比上月同期+70.3%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "用钱花",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "45.6 万",
    month: "156.9 万",
    data: "6.20-6.26退费后收入45.6万元（环比上周+2.2%），日均退费后收入6.5万元（环比上周+2.2%），本周退费率32.0%（环比上周+0.6pp），六月退费后收入156.9万元（环比上月同期+58.1%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "悦贷宝",
    impact: "中",
    urgency: "高",
    risk: "高",
    revenue: "-5494.5",
    month: "133.6 万",
    data: "6.20-6.26退费后收入-5494.5元（环比上周-64.0%），日均退费后收入-784.9元（环比上周-64.0%），本周退费率无订单金额（环比上周不可比），六月退费后收入133.6万元（环比上月同期+4412.9%）。",
    progress: "快钱支付已拉技术群对接。",
    risks: "新生支付受外部事件影响收紧，支付通道不稳定会直接影响上线节奏和扣款恢复。",
    actions: "推进快钱通道，处理悦贷宝存量签约用户下次扣款时间工单。",
  },
  {
    name: "好分期",
    impact: "高",
    urgency: "中",
    risk: "中",
    revenue: "37.2 万",
    month: "125.6 万",
    data: "6.20-6.26退费后收入37.2万元（环比上周+0.6%），日均退费后收入5.3万元（环比上周+0.6%），本周退费率8.0%（环比上周-1.5pp），六月退费后收入125.6万元（环比上月同期+58.6%）。",
    progress: "先享后付方案已推进，首月由客户侧发起扣款，接口文档已同步客户。",
    risks: "京东支付需 10 万押金，客户主体切换和三方协议争议点待确认。",
    actions: "跟进押金决策、主体切换流程和法务确认。",
  },
  {
    name: "惠花钱包",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "3.7 万",
    month: "46.6 万",
    data: "6.20-6.26退费后收入3.7万元（环比上周-78.5%），日均退费后收入5265.4元（环比上周-78.5%），本周退费率54.4%（环比上周+15.6pp），六月退费后收入46.6万元（环比上月同期+340.7%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "刷宝",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "7.9 万",
    month: "23.1 万",
    data: "6.20-6.26退费后收入7.9万元（环比上周-27.7%），日均退费后收入1.1万元（环比上周-27.7%），本周退费率24.3%（环比上周-11.5pp），六月退费后收入23.1万元（环比上月同期+265.6%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "喜心花",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "2.0 万",
    month: "6.5 万",
    data: "6.20-6.26退费后收入2.0万元（环比上周-29.8%），日均退费后收入2809.9元（环比上周-29.8%），本周退费率20.8%（环比上周-4.0pp），六月退费后收入6.5万元（环比上月同期-39.4%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "数智龟 / 数字龟",
    impact: "低",
    urgency: "中",
    risk: "低",
    revenue: "1.0 万",
    month: "6.1 万",
    data: "6.20-6.26退费后收入1.0万元（环比上周-42.6%），日均退费后收入1437.6元（环比上周-42.6%），本周退费率14.4%（环比上周+5.4pp），六月退费后收入6.1万元（环比上月同期+20.5%）。",
    progress: "小米、OPPO、vivo、荣耀、应用宝已上架；应用市场上架 SOP 已定稿。",
    risks: "华为和苹果仍存在审核卡点，100 元以上价格暂不支持。",
    actions: "继续整理大盘看板、有效订单报告查看占比，推进投放回传排期。",
  },
  {
    name: "薇钱包",
    impact: "中",
    urgency: "高",
    risk: "高",
    revenue: "1.6 万",
    month: "5.8 万",
    data: "6.20-6.26退费后收入1.6万元（环比上周-61.4%），日均退费后收入2277元（环比上周-61.4%），本周退费率41.5%（环比上周+8.1pp），六月退费后收入5.8万元（环比上月同期上月同期为0）。",
    progress: "薇钱包快钱商户号预计下周出来。",
    risks: "新生支付受外部事件影响收紧，支付通道不稳定会直接影响上线节奏和扣款恢复。",
    actions: "推进快钱通道，跟进商户号和上线排期。",
  },
  {
    name: "维信金科",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "1.0 万",
    month: "3.1 万",
    data: "6.20-6.26退费后收入1.0万元（环比上周+44.6%），日均退费后收入1459.2元（环比上周+44.6%），本周退费率11.4%（环比上周-4.3pp），六月退费后收入3.1万元（环比上月同期+128.7%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "优数智汇",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "-587.7",
    month: "1.6 万",
    data: "6.20-6.26退费后收入-587.7元（环比上周+5.4%），日均退费后收入-84元（环比上周+5.4%），本周退费率无订单金额（环比上周不可比），六月退费后收入1.6万元（环比上月同期-31.1%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "小赢科技",
    impact: "低",
    urgency: "中",
    risk: "低",
    revenue: "7591.9",
    month: "1.1 万",
    data: "6.20-6.26退费后收入7591.9元（环比上周+477.1%），日均退费后收入1084.6元（环比上周+477.1%），本周退费率1.9%（环比上周-0.3pp），六月退费后收入1.1万元（环比上月同期+84.4%）。",
    progress: "新增渠道入口和资源位后，日流水已有明显增长。",
    risks: "绝对规模仍小，需要继续观察切量后的转化稳定性。",
    actions: "下周二现场拜访，沟通协议支付/组件接口上线和运营数据。",
  },
  {
    name: "我来数科",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "1556.1",
    month: "6304.2",
    data: "6.20-6.26退费后收入1556.1元（环比上周+5.4%），日均退费后收入222.3元（环比上周+5.4%），本周退费率7.1%（环比上周-0.4pp），六月退费后收入6304.2元（环比上月同期-7.1%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "乐享借",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "867.1",
    month: "2193.6",
    data: "6.20-6.26退费后收入867.1元（环比上周-23.7%），日均退费后收入123.9元（环比上周-23.7%），本周退费率3.3%（环比上周-6.2pp），六月退费后收入2193.6元（环比上月同期上月同期为0）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "人品科技",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "926.7",
    month: "2163.6",
    data: "6.20-6.26退费后收入926.7元（环比上周+132.3%），日均退费后收入132.4元（环比上周+132.3%），本周退费率4.1%（环比上周-34.2pp），六月退费后收入2163.6元（环比上月同期+20.6%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "玖富 / 万卡",
    impact: "低",
    urgency: "低",
    risk: "中",
    revenue: "328.9",
    month: "2053.1",
    data: "6.20-6.26退费后收入328.9元（环比上周-45.0%），日均退费后收入47元（环比上周-45.0%），本周退费率35.3%（环比上周+26.2pp），六月退费后收入2053.1元（环比上月同期+303.8%）。",
    progress: "玖富倾向 API 接口接入权益；万卡组件单次权益流程图已发客户确认。",
    risks: "客户支持单月多次扣费，需控制客诉风险。",
    actions: "建议先上单次卡，观察客诉情况。",
  },
  {
    name: "云盛花",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "119.7",
    month: "877.8",
    data: "6.20-6.26退费后收入119.7元（环比上周-50.0%），日均退费后收入17.1元（环比上周-50.0%），本周退费率0.0%（环比上周+0.0pp），六月退费后收入877.8元（环比上月同期-40.5%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "众利",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "119.7",
    month: "478.8",
    data: "6.20-6.26退费后收入119.7元（环比上周-50.0%），日均退费后收入17.1元（环比上周-50.0%），本周退费率0.0%（环比上周-14.3pp），六月退费后收入478.8元（环比上月同期-71.4%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "玮雅信息(桃多多)",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "199.5",
    month: "438.9",
    data: "6.20-6.26退费后收入199.5元（环比上周+150.0%），日均退费后收入28.5元（环比上周+150.0%），本周退费率0.0%（环比上周+0.0pp），六月退费后收入438.9元（环比上月同期+120.0%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "消费保",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "0",
    month: "79.8",
    data: "6.20-6.26退费后收入0元（环比上周持平），日均退费后收入0元（环比上周持平），本周退费率无订单金额（环比上周不可比），六月退费后收入79.8元（环比上月同期上月同期为0）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "中国妇联",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "-0.02",
    month: "0.02",
    data: "6.20-6.26退费后收入-0.02元（环比上周上周为0），日均退费后收入-0.00元（环比上周上周为0），本周退费率无订单金额（环比上周不可比），六月退费后收入0.02元（环比上月同期上月同期为0）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "优小钱",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "0",
    month: "0",
    data: "6.20-6.26退费后收入0元（环比上周持平），日均退费后收入0元（环比上周持平），本周退费率无订单金额（环比上周不可比），六月退费后收入0元（环比上月同期持平）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "恒昌",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "0",
    month: "0",
    data: "6.20-6.26退费后收入0元（环比上周-100.0%），日均退费后收入0元（环比上周-100.0%），本周退费率无订单金额（环比上周不可比），六月退费后收入0元（环比上月同期-100.0%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "张江公证处",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "0",
    month: "0",
    data: "6.20-6.26退费后收入0元（环比上周持平），日均退费后收入0元（环比上周持平），本周退费率无订单金额（环比上周不可比），六月退费后收入0元（环比上月同期持平）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "嘉盈（招广）",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "0",
    month: "0",
    data: "6.20-6.26退费后收入0元（环比上周持平），日均退费后收入0元（环比上周持平），本周退费率无订单金额（环比上周不可比），六月退费后收入0元（环比上月同期持平）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "优鉴测试企业",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "0",
    month: "0",
    data: "6.20-6.26退费后收入0元（环比上周持平），日均退费后收入0元（环比上周持平），本周退费率无订单金额（环比上周不可比），六月退费后收入0元（环比上月同期持平）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "聘才猫",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "0",
    month: "0",
    data: "6.20-6.26退费后收入0元（环比上周持平），日均退费后收入0元（环比上周持平），本周退费率无订单金额（环比上周不可比），六月退费后收入0元（环比上月同期持平）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "深圳优钱科技有限公司",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "0",
    month: "0",
    data: "6.20-6.26退费后收入0元（环比上周持平），日均退费后收入0元（环比上周持平），本周退费率无订单金额（环比上周不可比），六月退费后收入0元（环比上月同期持平）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "星城惠选",
    impact: "中",
    urgency: "高",
    risk: "高",
    revenue: "0",
    month: "0",
    data: "6.20-6.26退费后收入0元（环比上周持平），日均退费后收入0元（环比上周持平），本周退费率无订单金额（环比上周不可比），六月退费后收入0元（环比上月同期持平）。",
    progress: "预发布权益包已配置，T 日/T-5 日短信已备案，400 专线与 IVR 自动退费推进中。",
    risks: "新生支付限制权益业务，生产环境存在合规问题，自动续费协议与线上扣款逻辑不一致。",
    actions: "切换其他通道继续对接，法务和产品同步调整协议与排期。",
  },
  {
    name: "锘陨趣记花",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "-29.9",
    month: "-29.9",
    data: "6.20-6.26退费后收入-29.9元（环比上周+0.0%），日均退费后收入-4.3元（环比上周+0.0%），本周退费率无订单金额（环比上周不可比），六月退费后收入-29.9元（环比上月同期-150.0%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
  {
    name: "测试（保留）",
    impact: "低",
    urgency: "低",
    risk: "低",
    revenue: "-0.13",
    month: "-79.8",
    data: "6.20-6.26退费后收入-0.13元（环比上周-38.1%），日均退费后收入-0.02元（环比上周-38.1%），本周退费率无订单金额（环比上周不可比），六月退费后收入-79.8元（环比上月同期-398850.0%）。",
    progress: "本周暂无相关信息",
    risks: "本周暂无相关信息",
    actions: "本周暂无相关信息",
  },
];

const nextItems = [
  ["P0", "宜信退费率压降与补贴 ROI 决策", "运营、数据、商务", "形成补贴/不补贴两套方案的收益、成本、退费率和客户量级影响测算。"],
  ["P0", "奇富支付/退费能力灰度验收", "产品、研发、运营", "完成灰度验证，确认我司直接调用支付公司扣款/退费链路可用。"],
  ["P1", "支付通道替换与上线排期重排", "商务、产品、法务、客户侧", "受新生限制影响项目明确替代通道和新排期。"],
  ["P1", "AI客服引入新供应商", "运营、客服、产品", "尽快完成对4家供应商（云蝠、百应、智齿、闪电）的模型测评，比价，并确认合作目标"],
  ["P1", "AI 提效迁移到稳定运行环境", "运营、技术", "明确服务器承载范围、部署清单、权限边界和日志审计方案。"],
  ["P2", "新产品方向最小样稿", "产品、运营", "金融情绪关怀报告和 AuraGarden 各完成一版可评审 MVP 框架。"],
];

const statusLabel = {
  high: "高风险",
  medium: "中风险",
  low: "观察中",
};

function Tone({ value, children }) {
  return <span className={`tone ${value}`}>{children}</span>;
}

function SectionTitle({ id, kicker, title, desc }) {
  return (
    <div className="section-title" id={id}>
      <span>{kicker}</span>
      <h2>{title}</h2>
      {desc ? <p>{desc}</p> : null}
    </div>
  );
}

function DataTable({ rows, columns, className = "" }) {
  return (
    <div className={`table-wrap ${className}`}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

function getMatrixQuadrant(client) {
  const highImpact = client.impact === "高";
  const highUrgency = client.urgency === "高";

  if (highImpact && highUrgency) return "高影响 / 高紧急";
  if (highImpact) return "高影响 / 低紧急";
  if (highUrgency) return "低影响 / 高紧急";
  return "低影响 / 低紧急";
}

function parseRevenueAmount(value) {
  const text = String(value || "").trim();
  const number = Number.parseFloat(text.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(number)) return 0;
  return text.includes("万") ? number * 10000 : number;
}

function buildMatrixItems(allClients) {
  const quadrantCounts = {};
  const basePosition = {
    "高影响 / 高紧急": { x: 74, y: 25 },
    "高影响 / 低紧急": { x: 31, y: 25 },
    "低影响 / 高紧急": { x: 74, y: 68 },
    "低影响 / 低紧急": { x: 31, y: 68 },
  };

  return allClients.flatMap((client) => {
    const quadrant = getMatrixQuadrant(client);
    const index = quadrantCounts[quadrant] || 0;
    quadrantCounts[quadrant] = index + 1;
    if (index >= 4) return [];

    const base = basePosition[quadrant];
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = Math.min(91, Math.max(9, base.x + (column - 1.5) * 8));
    const y = Math.min(87, Math.max(13, base.y + row * 6));

    return {
      ...client,
      quadrant,
      status: client.risk === "高" ? "high" : client.risk === "中" ? "medium" : "low",
      x,
      y,
    };
  });
}

function buildMatrixSummary(allClients) {
  const order = ["高影响 / 高紧急", "高影响 / 低紧急", "低影响 / 高紧急", "低影响 / 低紧急"];
  return order.map((quadrant) => {
    const list = allClients.filter((client) => getMatrixQuadrant(client) === quadrant);
    const visibleNames = list.slice(0, 4).map((client) => client.name);
    const clientsText = list.length > 4 ? `${visibleNames.join("、")}等` : visibleNames.join("、");
    return {
      quadrant,
      count: list.length,
      clients: clientsText || "暂无",
      action: list.some((client) => client.risk === "高")
        ? "含高风险项目，需优先跟进风险闭环和关键排期。"
        : "以数据观察和常规推进为主，保留关键节点跟踪。",
    };
  });
}

export function App() {
  const [active, setActive] = useState("overview");
  const [riskFilter, setRiskFilter] = useState("全部");
  const [collapsedClients, setCollapsedClients] = useState([]);
  const [query, setQuery] = useState("");

  const visibleClients = useMemo(() => clients.filter((client) => parseRevenueAmount(client.month) >= 1), []);
  const matrixClientItems = useMemo(() => buildMatrixItems(visibleClients), [visibleClients]);
  const matrixSummaryItems = useMemo(() => buildMatrixSummary(visibleClients), [visibleClients]);

  const filteredClients = useMemo(() => {
    return visibleClients.filter((client) => {
      const riskMatch = riskFilter === "全部" || client.risk === riskFilter;
      const queryMatch = client.name.toLowerCase().includes(query.trim().toLowerCase());
      return riskMatch && queryMatch;
    });
  }, [riskFilter, query, visibleClients]);

  const scrollTo = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="周报导航">
        <div className="brand">
          <div className="brand-mark">YG</div>
          <div>
            <strong>优鉴周报</strong>
            <span>客户组合经营看板</span>
          </div>
        </div>
        <nav>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <p>{group.title}</p>
              {group.items.map((item) => (
                <button
                  className={active === item.id ? "active" : ""}
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="source-box">
          <b>内容基准</b>
          <span>飞书文档：2026 Q2-6W4 | 0622-0628 周汇报</span>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p>Weekly Portfolio Review</p>
            <h1>2026 Q2-6W4 合作项目与 AI 提效周报</h1>
          </div>
          <div className="toolbar">
            <button type="button" onClick={() => scrollTo("clients")}>
              查看客户明细
            </button>
            <button type="button" onClick={() => scrollTo("next")}>
              下周重点
            </button>
          </div>
        </header>

        <section className="hero" id="overview">
          <div className="hero-copy">
            <div className="period">2026-06-22 至 2026-06-28</div>
            <h2>核心客户贡献稳定，但宜信退费率与支付通道风险需要优先处理</h2>
            <p>
              本周合作项目仍由宜信、奇富数科贡献主要收入。6.20-6.26 退费后收入 1392.5 万，较
              6.13-6.19 下降 11.9%；总退费率 21.6%，较上周基本持平。
            </p>
          </div>
          <div className="hero-metrics" aria-label="核心指标">
            <article>
              <span>6月退费后收入</span>
              <strong>5387.1万</strong>
              <small>6.1-6.26 累计</small>
            </article>
            <article>
              <span>本周退费后收入</span>
              <strong>1392.5万</strong>
              <small className="metric-change-good">环比 -11.9%</small>
            </article>
            <article>
              <span>客诉总量</span>
              <strong>399</strong>
              <small className="metric-change-good">环比 -20.2%</small>
            </article>
          </div>
        </section>

        <SectionTitle
          id="dashboard"
          kicker="01 / Operating Dashboard"
          title="数据大盘表现"
          desc="6月列为 2026-06-01 至 2026-06-26 累计；本周列按 2026-06-20 至 2026-06-26 汇总；环比上一自然周计算。"
        />
        <DataTable
          columns={["指标", "6月 6.1-6.26", "本周 6.20-6.26", "环比上周", "解读"]}
          rows={dashboardRows.map(([metric, month, week, change, tone, note]) => (
            <tr key={metric}>
              <td>{metric}</td>
              <td>{month}</td>
              <td>{week}</td>
              <td><Tone value={tone}>{change}</Tone></td>
              <td>{note}</td>
            </tr>
          ))}
        />

        <SectionTitle
          id="complaints"
          kicker="02 / Complaint Watch"
          title="客诉表现"
          desc="本周客诉总体下降，但监管平台客诉上升，京信查、宜信、奇富数科仍需重点跟踪。"
        />
        <div className="complaint-grid">
          <DataTable
            columns={["指标", "6.20-6.26", "环比", "说明"]}
            rows={complaintTotals.map(([metric, value, change, tone, note]) => (
              <tr key={metric}>
                <td>{metric}</td>
                <td>{value}</td>
                <td><Tone value={tone}>{change}</Tone></td>
                <td>{note}</td>
              </tr>
            ))}
          />
          <DataTable
            columns={["客户", "客诉量", "客诉人数", "订单数", "客诉 PPM", "判断"]}
            rows={complaintClients.map(([name, count, people, orders, ppm, note]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{count}</td>
                <td>{people}</td>
                <td>{orders}</td>
                <td>{ppm}</td>
                <td>{note}</td>
              </tr>
            ))}
          />
        </div>

        <SectionTitle
          id="month"
          kicker="03 / Monthly Revenue"
          title="6 月对比上月收益表现"
          desc="2026-06-01 至 2026-06-26 对比 2026-05-01 至 2026-05-26，保留全量项目。"
        />
        <DataTable
          className="monthly-table"
          columns={["项目/客户", "6 月退费后收入", "上月同期", "变化", "判断"]}
          rows={monthlyRows.map(([name, current, previous, change, tone, note]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{current}</td>
              <td>{previous}</td>
              <td><Tone value={tone}>{change}</Tone></td>
              <td>{note}</td>
            </tr>
          ))}
        />

        <SectionTitle
          id="clients"
          kicker="04 / Client Detail"
          title="分客户主要进展与风险"
          desc="默认展开所有客户，可按风险等级筛选，也可单独收起某个客户。"
        />
        <section className="client-tools">
          <div className="segmented" role="group" aria-label="风险筛选">
            {["全部", "高", "中", "低"].map((risk) => (
              <button
                className={riskFilter === risk ? "selected" : ""}
                key={risk}
                type="button"
                onClick={() => setRiskFilter(risk)}
              >
                {risk === "全部" ? "全部风险" : `${risk}风险`}
              </button>
            ))}
          </div>
          <input
            aria-label="搜索客户"
            placeholder="搜索客户"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </section>
        <div className="client-list">
          {filteredClients.map((client) => {
            const open = !collapsedClients.includes(client.name);
            return (
              <article className={open ? "open" : ""} key={client.name}>
                <button
                  type="button"
                  onClick={() => setCollapsedClients((current) => (
                    open
                      ? [...current, client.name]
                      : current.filter((name) => name !== client.name)
                  ))}
                >
                  <span className={`risk-dot risk-${client.risk}`}></span>
                  <b>{client.name}</b>
                  <small>影响 {client.impact}</small>
                  <small>紧急 {client.urgency}</small>
                  <small>本周 {client.revenue}</small>
                  <small>6月 {client.month}</small>
                  <em>{open ? "收起" : "展开"}</em>
                </button>
                {open ? (
                  <div className="client-detail">
                    {client.data ? (
                      <div>
                        <span>数据表现</span>
                        <p>{client.data}</p>
                      </div>
                    ) : null}
                    <div>
                      <span>本周进展</span>
                      <p>{client.progress}</p>
                    </div>
                    <div>
                      <span>风险与问题</span>
                      <p>{client.risks}</p>
                    </div>
                    <div>
                      <span>下周动作</span>
                      <p>{client.actions}</p>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <SectionTitle
          id="matrix"
          kicker="05 / Portfolio Matrix"
          title="客户组合矩阵"
          desc="按影响力和紧急度组织客户优先级，帮助快速判断哪些客户本周需要管理层关注。"
        />
        <section className="matrix-section">
          <div className="matrix-card">
            <div className="axis y">影响力</div>
            <div className="axis x">紧急度</div>
            <div className="matrix-label top-left">高影响 / 低紧急</div>
            <div className="matrix-label top-right">高影响 / 高紧急</div>
            <div className="matrix-label bottom-left">低影响 / 低紧急</div>
            <div className="matrix-label bottom-right">低影响 / 高紧急</div>
            {matrixClientItems.map((item) => (
              <button
                className={`matrix-dot ${item.status}`}
                key={item.name}
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
                title={`${item.name}：${item.quadrant}，6月 ${item.month}`}
                type="button"
                onClick={() => {
                  setRiskFilter(item.status === "high" ? "高" : item.status === "medium" ? "中" : "低");
                  scrollTo("clients");
                }}
              >
                <span>{item.name}</span>
              </button>
            ))}
          </div>
          <div className="decision-panel">
            <h3>执行摘要</h3>
            <ul>
              {matrixSummaryItems.map((item) => (
                <li key={item.quadrant}>
                  <b>{item.quadrant}（{item.count}）</b>
                  <span>{item.clients}</span>
                  <p>{item.action}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="two-column">
          <div>
            <SectionTitle
              id="aiops"
              kicker="06 / AI Operations"
              title="AI 智能运营"
              desc="从业务样板到平台化雏形，已验证信息入口、数据处理、自动化输出和知识沉淀闭环。"
            />
            <article className="narrative-card">
              <h3>项目总结</h3>
              <p>
                这两周主要围绕团队 AI 提效做了从业务样板到平台化雏形的验证：跑通退费率自动播报、客户台账、
                AI 日报周报、渠道/退费归因分析、图片转 Excel、短信日志核查、知识库与项目池沉淀等真实业务场景。
              </p>
              <p>
                下一步重点是把这些能力从个人电脑和临时脚本迁移到独立服务器，升级为团队可持续使用的 AI 经营协作基础设施。
              </p>
              <a href="https://ocn4u1j6s1bk.aiforce.cloud/app/app_178yrfb0uwu/" target="_blank" rel="noreferrer">
                AI智能运营工作汇报
              </a>
            </article>
          </div>
          <div>
            <SectionTitle
              id="service"
              kicker="07 / AI Service"
              title="AI 智能客服"
              desc="本周重点是新供应商测试与替代方案评估。"
            />
            <article className="narrative-card">
              <h3>供应商安排</h3>
              <p>
                基于七鱼目前的小模型能力和对接速度，以及扩展并发需要的成本，考虑引入新供应商。本周与李晴继续安排供应商沟通，
                与云蝠智能沟通测试，测试电话：
                <a href="https://agent.ccgpt.net/#/register" target="_blank" rel="noreferrer">021-3106-8238</a>
                ，整体价格为 2 万内不限并发。
              </p>
              <p>下周还有两家现场演示和体验测试，确认后计划选择 1 家引入合作，作为七鱼的替代备选方案。</p>
            </article>
          </div>
        </section>

        <SectionTitle
          id="new-products"
          kicker="08 / New Directions"
          title="新产品方向探索"
          desc="金融情绪关怀报告进入立项设计；Aura Garden 已完成商业说明书与原型演示，建议作为非金融方向重点推进。"
        />
        <section className="product-grid">
          <article>
            <span>金融方向</span>
            <h3>金融情绪关怀报告</h3>
            <p>
              面向被拒、未通过、额度不足等金融场景用户，承接负面情绪和不确定感，提供更具情绪价值的 AI 风险管家分析、安抚和下一步建议。
            </p>
            <ul>
              <li>目标用户：被拒后仍有解释、行动建议和情绪安抚需求的人群。</li>
              <li>产品价值：把“被拒”转化为可理解、可行动、可被陪伴的体验。</li>
            </ul>
          </article>
        </section>
        <section className="aura-showcase" aria-label="Aura Garden 重点项目">
          <div className="aura-copy">
            <span>非金融方向</span>
            <h3>Aura Garden灵修珠宝跨境项目</h3>
            <p>
              面向海外 20-45 岁女性用户的“私人运势顾问 + 灵性成长消费品”品牌。它不是单纯售卖水晶手链或香薰，
              而是用灵性测评、AI 陪伴、成长养成和定制珠宝/香薰，把一次性购买升级为持续陪伴关系。
            </p>
            <div className="aura-actions">
              <a href={auraDemoUrl} target="_blank" rel="noreferrer">查看原型演示</a>
              <a href={auraPlanUrl} target="_blank" rel="noreferrer">项目商业说明书</a>
            </div>
            <div className="aura-loop">
              <b>商业闭环</b>
              <ol>
                <li>免费灵性测评获取用户意图和邮箱/账号。</li>
                <li>AI 生成能量画像、每日洞察、成长计划和仪式提醒。</li>
                <li>根据画像推荐水晶、金属、护符、香型和祝福语。</li>
                <li>用定制珠宝、香薰、会员订阅和社群推动复购。</li>
              </ol>
            </div>
          </div>
          <div className="aura-visuals">
            <figure>
              <img src={`${import.meta.env.BASE_URL}aura/overview.png`} alt="Aura Garden 每日能量、成长路径和社区首页界面" />
              <figcaption>每日陪伴：能量状态、成长路径、打卡和社群内容。</figcaption>
            </figure>
            <figure>
              <img src={`${import.meta.env.BASE_URL}aura/product.png`} alt="Aura Garden 通过能量画像生成定制珠宝的产品界面" />
              <figcaption>商品转化：从能量画像映射到定制水晶珠宝。</figcaption>
            </figure>
          </div>
        </section>
        <section className="aura-validation">
          <article>
            <span>当前阶段</span>
            <strong>MVP 验证（0-2 个月）</strong>
            <p>先验证“灵性测评 + 能量匹配商品”是否能带来留资、点击和预购意愿。</p>
          </article>
          <article>
            <span>首批场景</span>
            <strong>爱情困境 / 能量保护 / 自我成长</strong>
            <p>围绕高共鸣内容做英文落地页、3 个水晶珠宝主题 SKU 和 30 条 TikTok 脚本。</p>
          </article>
          <article>
            <span>关键指标</span>
            <strong>测评完成率 / 留资率 / 商品点击率</strong>
            <p>同时观察用户是否相信“能量画像 -&gt; 推荐珠宝/香薰”的匹配逻辑。</p>
          </article>
        </section>

        <SectionTitle
          id="next"
          kicker="09 / Next Week"
          title="下周重点与需关注事项"
          desc="按优先级收束为可推进事项。"
        />
        <DataTable
          columns={["优先级", "事项", "负责人/协同", "完成标准"]}
          rows={nextItems.map(([priority, item, owner, done]) => (
            <tr key={item}>
              <td><span className={`priority ${priority.toLowerCase()}`}>{priority}</span></td>
              <td>{item}</td>
              <td>{owner}</td>
              <td>{done}</td>
            </tr>
          ))}
        />
      </main>
    </div>
  );
}
