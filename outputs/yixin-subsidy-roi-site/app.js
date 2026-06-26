const modeConfig = {
  conservative: {
    label: "保守",
    includePaymentFee: true,
    includeServiceCost: true,
    includeRetentionGain: false,
    note: "通道成本、客服/投诉成本；不计后续复购收益",
  },
  neutral: {
    label: "中性",
    includePaymentFee: true,
    includeServiceCost: false,
    includeRetentionGain: false,
    note: "通道成本；客服/投诉成本和后续复购收益暂不计入",
  },
  optimistic: {
    label: "乐观",
    includePaymentFee: true,
    includeServiceCost: false,
    includeRetentionGain: true,
    note: "通道成本；计入已确认的后续复购收益",
  },
};

const fields = {
  basePay: document.querySelector("#base-pay"),
  subsidyPay: document.querySelector("#subsidy-pay"),
  baseRefund: document.querySelector("#base-refund"),
  subsidyRefund: document.querySelector("#subsidy-refund"),
  subsidyCost: document.querySelector("#subsidy-cost"),
  marketingCost: document.querySelector("#marketing-cost"),
  paymentFee: document.querySelector("#payment-fee"),
  serviceCost: document.querySelector("#service-cost"),
  retentionGain: document.querySelector("#retention-gain"),
  baseMultiNet: document.querySelector("#base-multi-net"),
  subsidyMultiNet: document.querySelector("#subsidy-multi-net"),
};

const outputs = {
  apparentRoi: document.querySelector("#apparent-roi"),
  netProfitRoi: document.querySelector("#net-profit-roi"),
  refundAdjustedRoi: document.querySelector("#refund-adjusted-roi"),
  multiAdjustedRoi: document.querySelector("#multi-adjusted-roi"),
  payIncrement: document.querySelector("#pay-increment"),
  refundIncrement: document.querySelector("#refund-increment"),
  mainCost: document.querySelector("#main-cost"),
  modeNote: document.querySelector("#mode-note"),
  decisionTitle: document.querySelector("#decision-title"),
  decisionCopy: document.querySelector("#decision-copy"),
};

const form = document.querySelector("#roi-form");
const modeButtons = [...document.querySelectorAll(".mode-button")];
const sampleButton = document.querySelector("#sample-button");
let activeMode = "conservative";

function numberValue(input) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : 0;
}

function hasCoreInput() {
  return [
    fields.basePay,
    fields.subsidyPay,
    fields.baseRefund,
    fields.subsidyRefund,
    fields.subsidyCost,
    fields.marketingCost,
  ].some((input) => input.value !== "");
}

function formatMoney(value) {
  if (!Number.isFinite(value)) return "待填";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRoi(value, cost) {
  if (!Number.isFinite(value) || !cost) return "待填";
  return `${(value * 100).toFixed(2)}%`;
}

function setTone(element, value, cost) {
  element.classList.remove("positive", "negative", "neutral");
  if (!cost || !Number.isFinite(value)) return;
  if (value > 0) element.classList.add("positive");
  if (value < 0) element.classList.add("negative");
  if (value === 0) element.classList.add("neutral");
}

function calculate() {
  const config = modeConfig[activeMode];
  const basePay = numberValue(fields.basePay);
  const subsidyPay = numberValue(fields.subsidyPay);
  const baseRefund = numberValue(fields.baseRefund);
  const subsidyRefund = numberValue(fields.subsidyRefund);
  const subsidyCost = numberValue(fields.subsidyCost);
  const marketingCost = numberValue(fields.marketingCost);
  const paymentFee = config.includePaymentFee ? numberValue(fields.paymentFee) : 0;
  const serviceCost = config.includeServiceCost ? numberValue(fields.serviceCost) : 0;
  const retentionGain = config.includeRetentionGain ? numberValue(fields.retentionGain) : 0;
  const baseMultiNet = numberValue(fields.baseMultiNet);
  const subsidyMultiNet = numberValue(fields.subsidyMultiNet);

  const mainCost = subsidyCost + marketingCost;
  const payIncrement = subsidyPay - basePay;
  const refundIncrement = subsidyRefund - baseRefund;
  const baseNet = basePay - baseRefund;
  const subsidyNet = subsidyPay - subsidyRefund;
  const otherCost = paymentFee + serviceCost;
  const apparentRoi = payIncrement / mainCost;
  const netProfitRoi = (subsidyNet - baseNet - otherCost + retentionGain) / mainCost;
  const refundAdjustedRoi = (payIncrement - refundIncrement - otherCost + retentionGain) / mainCost;
  const multiAdjustedRoi =
    (subsidyNet - subsidyMultiNet - (baseNet - baseMultiNet) - otherCost + retentionGain) / mainCost;

  outputs.apparentRoi.textContent = formatRoi(apparentRoi, mainCost);
  outputs.netProfitRoi.textContent = formatRoi(netProfitRoi, mainCost);
  outputs.refundAdjustedRoi.textContent = formatRoi(refundAdjustedRoi, mainCost);
  outputs.multiAdjustedRoi.textContent = formatRoi(multiAdjustedRoi, mainCost);
  outputs.payIncrement.textContent = hasCoreInput() ? formatMoney(payIncrement) : "待填";
  outputs.refundIncrement.textContent = hasCoreInput() ? formatMoney(refundIncrement) : "待填";
  outputs.mainCost.textContent = mainCost ? formatMoney(mainCost) : "待填";
  outputs.modeNote.textContent = config.note;

  [
    [outputs.apparentRoi, apparentRoi],
    [outputs.netProfitRoi, netProfitRoi],
    [outputs.refundAdjustedRoi, refundAdjustedRoi],
    [outputs.multiAdjustedRoi, multiAdjustedRoi],
  ].forEach(([element, value]) => setTone(element, value, mainCost));

  updateDecision(netProfitRoi, refundIncrement, multiAdjustedRoi, mainCost);
}

function updateDecision(netProfitRoi, refundIncrement, multiAdjustedRoi, mainCost) {
  if (!mainCost) {
    outputs.decisionTitle.textContent = "等待输入";
    outputs.decisionCopy.textContent = "填入补贴期和基准期数据后，这里会给出继续、收缩、限投或暂停验证的建议。";
    return;
  }

  if (netProfitRoi > 0 && refundIncrement <= 0) {
    outputs.decisionTitle.textContent = "补贴有效，可继续灰度";
    outputs.decisionCopy.textContent = "净利润 ROI 为正，且退费没有吞掉增量收益。建议继续观察分层表现，再决定是否扩大。";
    return;
  }

  if (netProfitRoi > 0 && multiAdjustedRoi <= 0) {
    outputs.decisionTitle.textContent = "整体可行，但多头需限投";
    outputs.decisionCopy.textContent = "主口径为正，多头修正后转弱。建议对宜信后多头和密集购买用户降补或权益隔离。";
    return;
  }

  if (netProfitRoi <= 0) {
    outputs.decisionTitle.textContent = "暂不建议扩大投放";
    outputs.decisionCopy.textContent = "净利润 ROI 未转正，优先检查退费、通道成本、客服成本和多头客群拖累。";
    return;
  }

  outputs.decisionTitle.textContent = "建议继续验证";
  outputs.decisionCopy.textContent = "当前结果对成本或后续收益敏感，建议延长观察窗口或只做小规模灰度。";
}

function setMode(mode) {
  activeMode = mode;
  modeButtons.forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  calculate();
}

function fillSample() {
  const sample = {
    basePay: 830000,
    subsidyPay: 960000,
    baseRefund: 166000,
    subsidyRefund: 174000,
    subsidyCost: 42000,
    marketingCost: 18000,
    paymentFee: 9000,
    serviceCost: 6000,
    retentionGain: 28000,
    baseMultiNet: 98000,
    subsidyMultiNet: 168000,
  };

  Object.entries(sample).forEach(([key, value]) => {
    fields[key].value = value;
  });
  calculate();
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

Object.values(fields).forEach((input) => {
  input.addEventListener("input", calculate);
});

sampleButton.addEventListener("click", fillSample);
form.addEventListener("reset", () => {
  window.setTimeout(calculate, 0);
});

calculate();
