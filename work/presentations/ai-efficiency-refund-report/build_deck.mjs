import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = path.resolve("outputs/ai-efficiency-refund-report.pptx");
const WORK = path.resolve("work/presentations/ai-efficiency-refund-report");
const PREVIEW = path.join(WORK, "preview");
const LAYOUT = path.join(WORK, "layout");
const QA = path.join(WORK, "qa");

const W = 1280;
const H = 720;
const C = {
  navy: "#0B1F33",
  ink: "#132238",
  muted: "#5B677A",
  line: "#D8E0EA",
  paper: "#F6F8FB",
  teal: "#0A7C86",
  green: "#2E7D32",
  amber: "#D97706",
  red: "#B91C1C",
  white: "#FFFFFF",
  blue: "#2563EB",
};

const font = "Microsoft YaHei";

async function writeBlob(file, blob) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, Buffer.from(await blob.arrayBuffer()));
}

function addBox(slide, x, y, w, h, fill = C.white, line = C.line, radius = 8) {
  return slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: line, width: line === "none" ? 0 : 1 },
    borderRadius: radius,
  });
}

function addText(slide, text, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: opts.size ?? 22,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
    typeface: opts.face ?? font,
    lineSpacing: opts.lineSpacing ?? 1.1,
    wrap: "square",
    insets: opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
  };
  return shape;
}

function addHeader(slide, no, title, kicker = "运营团队 AI 提效落地复盘") {
  addText(slide, kicker, 70, 34, 520, 28, { size: 14, bold: true, color: C.teal });
  addText(slide, String(no).padStart(2, "0"), 1150, 30, 60, 28, {
    size: 15,
    bold: true,
    color: C.muted,
    align: "right",
  });
  addText(slide, title, 70, 72, 1040, 56, { size: 38, bold: true, color: C.navy });
  slide.shapes.add({
    geometry: "line",
    position: { left: 70, top: 134, width: 1140, height: 0 },
    fill: "none",
    line: { style: "solid", fill: C.line, width: 1 },
  });
}

function addBottomLine(slide, text) {
  addText(slide, text, 70, 650, 1000, 32, { size: 17, color: C.muted });
  slide.shapes.add({
    geometry: "line",
    position: { left: 70, top: 636, width: 1140, height: 0 },
    fill: "none",
    line: { style: "solid", fill: C.line, width: 1 },
  });
}

function addBullets(slide, items, x, y, w, opts = {}) {
  const gap = opts.gap ?? 42;
  const size = opts.size ?? 23;
  items.forEach((item, i) => {
    const cy = y + i * gap;
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: x, top: cy + 7, width: 10, height: 10 },
      fill: opts.dot ?? C.teal,
      line: { style: "solid", fill: "none", width: 0 },
    });
    addText(slide, item, x + 26, cy, w - 26, gap, { size, color: opts.color ?? C.ink });
  });
}

function addNumbered(slide, items, x, y, w, opts = {}) {
  const gap = opts.gap ?? 50;
  items.forEach((item, i) => {
    const cy = y + i * gap;
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: x, top: cy, width: 34, height: 34 },
      fill: opts.fill ?? C.teal,
      line: { style: "solid", fill: "none", width: 0 },
    });
    addText(slide, String(i + 1), x, cy + 4, 34, 24, {
      size: 16,
      bold: true,
      color: C.white,
      align: "center",
    });
    addText(slide, item, x + 48, cy + 2, w - 48, 42, { size: opts.size ?? 21, color: C.ink });
  });
}

function addCallout(slide, text, x, y, w, h, color = C.teal) {
  addBox(slide, x, y, w, h, "#EEF8F8", "#B7DCDD", 8);
  slide.shapes.add({
    geometry: "rect",
    position: { left: x, top: y, width: 7, height: h },
    fill: color,
    line: { style: "solid", fill: "none", width: 0 },
  });
  addText(slide, text, x + 22, y + 18, w - 40, h - 30, { size: 22, bold: true, color: C.navy });
}

function setNotes(slide, text) {
  slide.speakerNotes.textFrame.setText(text);
  slide.speakerNotes.setVisible(true);
}

function newSlide(presentation) {
  const slide = presentation.slides.add();
  slide.background.fill = C.paper;
  return slide;
}

function slide01(p) {
  const slide = newSlide(p);
  slide.shapes.add({
    geometry: "rect",
    position: { left: 0, top: 0, width: 1280, height: 720 },
    fill: {
      type: "gradient",
      gradientKind: "linear",
      angleDeg: 0,
      stops: [
        { offset: 0, color: "#0B1F33" },
        { offset: 100000, color: "#0A7C86" },
      ],
    },
    line: { style: "solid", fill: "none", width: 0 },
  });
  addText(slide, "从退费率播报开始", 78, 132, 780, 78, { size: 58, bold: true, color: C.white });
  addText(slide, "运营团队 AI 提效的第一轮落地复盘", 82, 224, 820, 54, {
    size: 34,
    bold: true,
    color: "#DFF7F6",
  });
  addText(slide, "6 月 19-21 日工作总结｜从工具链验证到业务样板跑通", 82, 314, 760, 36, {
    size: 23,
    color: "#E6F2F4",
  });
  addBox(slide, 82, 430, 640, 100, "rgba(255,255,255,0.10)", "rgba(255,255,255,0.28)", 8);
  addText(slide, "关键词：真实任务  /  数据口径  /  钉钉播报  /  工作流沉淀", 112, 465, 580, 34, {
    size: 22,
    bold: true,
    color: C.white,
  });
  addText(slide, "内部分享草稿", 1030, 636, 160, 28, { size: 18, color: "#DFF7F6", align: "right" });
  setNotes(
    slide,
    "这次分享不是讲 AI 概念，而是复盘我这几天如何参考《管理者如何带团队用 AI》的思路，从一个真实运营场景切入，把 AI 提效从想法推进到可跑、可查、可迭代的工作流。"
  );
}

function slide02(p) {
  const slide = newSlide(p);
  addHeader(slide, 2, "为什么现在要做 AI 提效");
  addText(slide, "重点不是先买工具，而是先找到团队中真实、重复、可检查的工作。", 82, 160, 1000, 40, {
    size: 27,
    bold: true,
    color: C.navy,
  });
  addBullets(
    slide,
    [
      "运营数据定期查看、汇总、播报",
      "客户 / 项目沟通信息整理",
      "日报、周报、复盘材料生成",
      "异常数据初步识别和提醒",
      "跨工具信息搬运、格式整理、文档沉淀",
    ],
    108,
    238,
    620,
    { gap: 52, size: 24 }
  );
  addCallout(
    slide,
    "第一阶段不追求全自动决策。\n让 AI 先承担收集、整理、生成、提醒、初步分析；人继续负责判断、确认和行动。",
    760,
    238,
    390,
    220,
    C.amber
  );
  addBottomLine(slide, "把 AI 放进真实岗位工作，而不是停留在抽象能力演示。");
  setNotes(
    slide,
    "当前运营、数据策略、运维都有大量重复的信息处理工作。我的判断是，第一阶段不要追求 AI 替人做决策，而是先让 AI 做低风险、可检查的工作：收集、整理、生成初稿、提醒和初步分析。"
  );
}

function slide03(p) {
  const slide = newSlide(p);
  addHeader(slide, 3, "参考框架：先盘工作，再买工具");
  addText(slide, "这几天基本按《管理者如何带团队用 AI》的落地思路推进。", 82, 158, 980, 38, {
    size: 26,
    bold: true,
    color: C.navy,
  });
  const steps = [
    ["先盘工作", "找出重复、高频、可标准化任务"],
    ["再选工具", "连接数据源、文档、IM、自动化工具"],
    ["重新分工", "AI 做信息处理和初稿，人做判断"],
    ["让它稳定", "固化流程、口径、格式、异常处理"],
    ["形成能力", "从单个样板扩展到团队机制"],
  ];
  const startX = 74;
  steps.forEach((s, i) => {
    const x = startX + i * 226;
    addBox(slide, x, 250, 186, 160, C.white, C.line, 8);
    addText(slide, `0${i + 1}`, x + 18, 272, 50, 28, { size: 18, bold: true, color: C.teal });
    addText(slide, s[0], x + 18, 306, 150, 30, { size: 23, bold: true, color: C.navy });
    addText(slide, s[1], x + 18, 350, 145, 52, { size: 16, color: C.muted });
    if (i < steps.length - 1) {
      slide.shapes.add({
        geometry: "rightArrow",
        position: { left: x + 190, top: 312, width: 28, height: 24 },
        fill: C.line,
        line: { style: "solid", fill: "none", width: 0 },
      });
    }
  });
  addCallout(slide, "这次没有先问“大模型能做什么”，而是先选了一个真实业务场景：退费率播报。", 184, 505, 900, 84, C.teal);
  setNotes(
    slide,
    "我借用书里的框架：先盘工作、再选工具、重新分工、让流程稳定、最后形成团队能力。退费率播报就是这个路径下挑出来的一个样板。"
  );
}

function slide04(p) {
  const slide = newSlide(p);
  addHeader(slide, 4, "三天工作路线");
  const days = [
    ["6 月 19 日", "验证工具链和数据链路", ["验证 DingTalk / Feishu / DataFinder / Codex 协作路径", "尝试取数、生成报表、推送消息、写入文档", "暴露口径、展示、工具稳定性问题"], C.teal],
    ["6 月 20 日", "补齐钉钉和 OpenClaw 能力", ["安装和修复 DingTalk OpenClaw / Gateway", "验证机器人、网关、插件、健康检查", "为钉钉卡片和自动化播报打基础"], C.amber],
    ["6 月 21 日", "退费率播报进入可复用版本", ["完善字段和展示格式", "修正分时 / 全天对比口径", "补充青龙调度、版本文档、Skill 沉淀"], C.blue],
  ];
  days.forEach((d, i) => {
    const x = 82 + i * 386;
    addText(slide, d[0], x, 170, 190, 28, { size: 19, bold: true, color: d[3] });
    addBox(slide, x, 214, 330, 300, C.white, C.line, 8);
    addText(slide, d[1], x + 24, 238, 270, 54, { size: 26, bold: true, color: C.navy });
    addBullets(slide, d[2], x + 26, 322, 270, { gap: 62, size: 16, dot: d[3] });
  });
  addBottomLine(slide, "路线从“能不能用”推进到“能不能稳定复用”。");
  setNotes(
    slide,
    "三天的工作不是离散尝试。19 号主要是工具链和数据链路；20 号补齐钉钉 OpenClaw、Gateway 和机器人能力；21 号把退费率播报推进到可复用版本，并开始有版本文档、调度和 Skill 沉淀。"
  );
}

function slide05(p) {
  const slide = newSlide(p);
  addHeader(slide, 5, "样板案例：退费率播报");
  addText(slide, "它不是简单发一条消息，而是一个完整的业务工作流。", 82, 158, 930, 38, {
    size: 26,
    bold: true,
    color: C.navy,
  });
  const flow = ["DataFinder\n取数", "企业维度\n聚合", "指标计算\n与对比", "钉钉格式\n生成", "机器人\n推送", "文档/Skill\n沉淀"];
  flow.forEach((label, i) => {
    const x = 82 + i * 186;
    addBox(slide, x, 262, 142, 96, C.white, C.line, 8);
    addText(slide, label, x + 14, 284, 114, 52, { size: 20, bold: true, color: C.navy, align: "center" });
    if (i < flow.length - 1) {
      slide.shapes.add({
        geometry: "rightArrow",
        position: { left: x + 148, top: 298, width: 34, height: 24 },
        fill: C.teal,
        line: { style: "solid", fill: "none", width: 0 },
      });
    }
  });
  addBullets(
    slide,
    [
      "计算退费率、退费金额、支付金额、退费后金额等指标",
      "对比昨日同分时，以及前日 / 昨日全天参考值",
      "把数据、格式、播报、文档、验证连接成一条链路",
    ],
    112,
    438,
    900,
    { gap: 44, size: 22 }
  );
  addBottomLine(slide, "价值不在于 AI 生成文字，而在于 AI 进入真实业务链路。");
  setNotes(
    slide,
    "退费率播报包含从 DataFinder 拉取支付和退费数据，按企业聚合，计算退费率、金额、支付数、退费后金额等指标，对比昨日同分时和全日参考，然后生成适合钉钉查看的格式并推送。最后还要把经验沉淀到文档和 Skill 中。"
  );
}

function slide06(p) {
  const slide = newSlide(p);
  addHeader(slide, 6, "过程中发现的关键问题");
  const issues = [
    ["数据口径", "PV、事件数、金额合计容易混用，金额字段必须按正确方式聚合。"],
    ["展示效果", "API 返回成功不等于客户端展示正确，需要看真实消息效果。"],
    ["时间窗口", "0点特殊：昨日全天对比前日全天。"],
    ["格式稳定", "长表格、多行 Markdown 不一定稳定，需要卡片 / 图片表格。"],
    ["链路稳定", "安装、网关、权限、调度、日志都要纳入验证。"],
  ];
  issues.forEach((it, i) => {
    const x = i < 3 ? 84 + i * 370 : 270 + (i - 3) * 410;
    const y = i < 3 ? 186 : 424;
    addBox(slide, x, y, i < 3 ? 320 : 360, 150, C.white, C.line, 8);
    addText(slide, it[0], x + 22, y + 22, 150, 28, { size: 24, bold: true, color: i === 0 ? C.red : C.teal });
    addText(slide, it[1], x + 22, y + 66, (i < 3 ? 272 : 312), 62, { size: 17, color: C.ink });
  });
  addBottomLine(slide, "问题往往不在模型，而在数据、工具和流程细节。");
  setNotes(
    slide,
    "这次最大的收获是，真正落地时问题往往不是模型能力，而是数据口径、展示效果、时间窗口、格式稳定性、工具链稳定性。AI 提效不是让 AI 想一下就完了，而是把真实业务里的坑一个个跑出来、修掉、固化。"
  );
}

function slide07(p) {
  const slide = newSlide(p);
  addHeader(slide, 7, "这次形成的初步方法");
  addText(slide, "一个 AI 工作流从想法到落地，可以按这 8 步推进。", 82, 158, 940, 34, {
    size: 25,
    bold: true,
    color: C.navy,
  });
  const left = ["选真实、高频、低风险任务", "明确输入来源", "明确输出格式", "跑通最小样板"];
  const right = ["做口径校验", "做展示验证", "沉淀文档和 Skill", "根据反馈持续迭代"];
  addNumbered(slide, left, 110, 228, 500, { gap: 70, size: 23, fill: C.teal });
  addNumbered(slide, right, 690, 228, 500, { gap: 70, size: 23, fill: C.blue });
  addBottomLine(slide, "核心是从单点尝试走向可复用的闭环。");
  setNotes(
    slide,
    "这次可以提炼成一个方法：先选真实、高频、低风险任务；明确输入来源和输出格式；跑通最小样板；做口径校验和展示验证；最后沉淀文档和 Skill，并根据团队反馈持续迭代。"
  );
}

function slide08(p) {
  const slide = newSlide(p);
  addHeader(slide, 8, "对不同角色的价值");
  const roles = [
    ["运营组长", ["减少重复查数、整理、播报时间", "更快看到异常企业和异常指标", "把精力放在判断原因和推动动作上"], C.teal],
    ["数据和策略组长", ["推动指标口径标准化", "减少“有数据但口径不稳”的问题", "让策略分析从临时取数变成可复用模板"], C.blue],
    ["运维", ["明确机器人、调度、服务、日志责任边界", "将播报从手工动作变成可维护任务", "提前暴露权限、网关、客户端展示问题"], C.amber],
  ];
  roles.forEach((role, i) => {
    const x = 82 + i * 386;
    addBox(slide, x, 190, 330, 340, C.white, C.line, 8);
    slide.shapes.add({
      geometry: "rect",
      position: { left: x, top: 190, width: 330, height: 8 },
      fill: role[2],
      line: { style: "solid", fill: "none", width: 0 },
    });
    addText(slide, role[0], x + 24, 230, 260, 34, { size: 28, bold: true, color: C.navy });
    addBullets(slide, role[1], x + 24, 302, 270, { gap: 62, size: 18, dot: role[2] });
  });
  addBottomLine(slide, "不是单点工具实验，而是运营、数据策略、运维的协同机制。");
  setNotes(
    slide,
    "对运营组长，它减少重复查数和播报，把精力释放到判断和跟进。对数据和策略组长，它推动指标口径标准化。对运维，它把机器人、调度、服务、日志和健康检查纳入可维护链路。"
  );
}

function slide09(p) {
  const slide = newSlide(p);
  addHeader(slide, 9, "下一步计划");
  addText(slide, "接下来不是做更多零散尝试，而是围绕任务、数据源、工作流、格式持续迭代。", 82, 156, 1020, 42, {
    size: 25,
    bold: true,
    color: C.navy,
  });
  const plans = [
    ["梳理任务", "盘点运营、数据策略、运维高频重复任务，按频率、风险、输入和输出清晰度排序。"],
    ["优化数据源准确性", "明确每个指标的数据来源、统计口径、时间窗口、异常边界，避免 AI 放大错误数据。"],
    ["明确工作流和格式", "固定触发方式、执行步骤、人工确认点、输出模板、失败处理方式。"],
    ["持续迭代和团队融入", "先从退费率播报样板扩展到日报、周报、客户风险提醒、运营复盘等场景。"],
  ];
  plans.forEach((pl, i) => {
    const x = i % 2 === 0 ? 100 : 675;
    const y = i < 2 ? 242 : 434;
    addBox(slide, x, y, 500, 130, C.white, C.line, 8);
    addText(slide, `0${i + 1}`, x + 24, y + 24, 42, 26, { size: 18, bold: true, color: C.teal });
    addText(slide, pl[0], x + 78, y + 22, 330, 30, { size: 24, bold: true, color: C.navy });
    addText(slide, pl[1], x + 78, y + 64, 370, 48, { size: 17, color: C.muted });
  });
  setNotes(
    slide,
    "下一步重点不是做更多零散尝试，而是四件事：梳理任务，优化数据源准确性，明确工作流和格式，持续迭代并让 AI 融入团队日常。"
  );
}

function slide10(p) {
  const slide = newSlide(p);
  addHeader(slide, 10, "结尾：AI 提效的判断标准");
  const checks = [
    "是否减少重复整理时间",
    "是否让数据和信息更快被看见",
    "是否让输出格式更稳定",
    "是否保留人的判断和确认",
    "是否能被复用到下一个任务",
    "是否沉淀成团队可继承的方法",
  ];
  addBullets(slide, checks, 126, 190, 760, { gap: 55, size: 25, dot: C.green });
  addCallout(
    slide,
    "退费率播报只是起点。\n真正的目标，是让 AI 从个人尝试变成团队工作流的一部分。",
    700,
    314,
    430,
    170,
    C.green
  );
  addBottomLine(slide, "帮助运营、数据策略和运维更快发现问题、更稳处理问题、更高效复盘问题。");
  setNotes(
    slide,
    "我认为判断 AI 有没有真正提效，不看用了多少工具，而看有没有改变团队工作方式：是否减少重复整理时间、让信息更快被看见、输出更稳定、保留人的判断、能复用到下一个任务，并沉淀成团队可继承的方法。"
  );
}

async function main() {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.mkdir(PREVIEW, { recursive: true });
  await fs.mkdir(LAYOUT, { recursive: true });
  await fs.mkdir(QA, { recursive: true });
  await fs.writeFile(
    path.join(WORK, "source-notes.txt"),
    "Deck created from the user-provided 10-slide draft. Default template inspection was attempted but blocked by missing unzip -Z1 support in this Windows runtime, so the deck was generated from scratch with artifact-tool.\n",
    "utf8"
  );

  const p = Presentation.create({ slideSize: { width: W, height: H } });
  [slide01, slide02, slide03, slide04, slide05, slide06, slide07, slide08, slide09, slide10].forEach((fn) => fn(p));

  for (const [index, slide] of p.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(path.join(PREVIEW, `${stem}.png`), await p.export({ slide, format: "png", scale: 1 }));
    await fs.writeFile(path.join(LAYOUT, `${stem}.layout.json`), await (await slide.export({ format: "layout" })).text());
  }
  await writeBlob(path.join(PREVIEW, "montage.webp"), await p.export({ format: "webp", montage: true, scale: 1 }));
  const inspect = await p.inspect({ kind: "slide,textbox,shape,notes,layout", maxChars: 20000 });
  await fs.writeFile(path.join(QA, "inspect.ndjson"), inspect.ndjson, "utf8");

  const pptx = await PresentationFile.exportPptx(p);
  await pptx.save(OUT);
  console.log(OUT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
