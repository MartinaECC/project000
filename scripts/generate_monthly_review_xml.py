from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a Feishu XML monthly review draft from monthly_review_datafinder.py JSON.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--company", required=True)
    args = parser.parse_args()

    payload = json.loads(Path(args.input).read_text(encoding="utf-8-sig"))
    xml = build_xml(args.title, args.company, payload)
    Path(args.output).write_text(xml, encoding="utf-8")


def build_xml(title: str, company: str, payload: dict[str, Any]) -> str:
    target = payload["target"]
    comparison = payload["comparison"]
    periods = payload["periods"]
    target_month = int(periods["target"]["start"][5:7])
    comparison_month = int(periods["comparison"]["start"][5:7])

    gross = metric(target["grossIncome"], comparison["grossIncome"])
    refund = metric(target["refundAmount"], comparison["refundAmount"])
    net = metric(target["grossIncome"] - target["refundAmount"], comparison["grossIncome"] - comparison["refundAmount"])
    daily_net = metric(net["value"] / periods["target"]["days"], net["comparison"] / periods["comparison"]["days"])

    active = metric(target["activeIncome"], comparison["activeIncome"])
    active_refund = metric(target["activeRefundAmount"], comparison["activeRefundAmount"])
    active_net = metric(target["activeIncome"] - target["activeRefundAmount"], comparison["activeIncome"] - comparison["activeRefundAmount"])
    active_refund_rate = pct_metric(target["activeRefundAmount"], target["activeIncome"], comparison["activeRefundAmount"], comparison["activeIncome"])

    renewal = metric(target["renewalIncome"], comparison["renewalIncome"])
    renewal_refund = metric(target["renewalRefundAmount"], comparison["renewalRefundAmount"])
    renewal_net = metric(target["renewalIncome"] - target["renewalRefundAmount"], comparison["renewalIncome"] - comparison["renewalRefundAmount"])
    renewal_refund_rate = pct_metric(target["renewalRefundAmount"], target["renewalIncome"], comparison["renewalRefundAmount"], comparison["renewalIncome"])

    refund_rate = pct_metric(target["refundAmount"], target["grossIncome"], comparison["refundAmount"], comparison["grossIncome"])
    cancellation_rate = pct_metric(target["cancellations"], target["signups"], comparison["cancellations"], comparison["signups"])
    charge_rate = pct_metric(target["chargeSuccesses"], target["chargeAttempts"], comparison["chargeSuccesses"], comparison["chargeAttempts"])

    return "\n\n".join(
        [
            f"<title>{esc(title)}</title>",
            f"<h1>{esc(title)}</h1>",
            f"<p>统计周期：<b>{esc(periods['target']['start'])}</b> 至 <b>{esc(periods['target']['end'])}</b>；环比周期：<b>{esc(periods['comparison']['start'])}</b> 至 <b>{esc(periods['comparison']['end'])}</b>。所有环比均按自然月计算。</p>",
            "<h2>规则调整总览</h2>",
            "<table><thead><tr><th>事项</th><th>本月情况</th><th>影响判断</th><th>待补充信息</th></tr></thead><tbody><tr><td>规则调整</td><td>待补充</td><td>需结合收入、退费、扣款表现确认</td><td>规则上线时间、影响人群、账期或扣款策略变化</td></tr></tbody></table>",
            "<ul><li>规则调整、账期变化、扣款策略变化暂无法仅通过 DataFinder 判断，需业务侧补充。</li></ul>",
            "<h2>收入表现</h2>",
            table(["指标", f"2026年{target_month}月", f"2026年{comparison_month}月", "环比"], [
                ["总收入", money(gross["value"]), money(gross["comparison"]), mom(gross)],
                ["退费金额", money(refund["value"]), money(refund["comparison"]), mom(refund)],
                ["退费后收入", money(net["value"]), money(net["comparison"]), mom(net)],
                ["退费后日均收入", money(daily_net["value"]), money(daily_net["comparison"]), mom(daily_net)],
            ]),
            f"<ul><li>{target_month}月总收入 <b>{money(gross['value'])}</b>，环比{comparison_month}月增长 <b>{mom_abs(gross)}</b>。</li><li>{target_month}月退费后收入 <b>{money(net['value'])}</b>，环比{comparison_month}月增长 <b>{mom_abs(net)}</b>；退费后日均收入 <b>{money(daily_net['value'])}</b>，环比变化 <b>{mom(daily_net)}</b>。</li><li>{target_month}月退费金额 <b>{money(refund['value'])}</b>，较{comparison_month}月 <b>{money(refund['comparison'])}</b> 上升，需结合规则调整与客诉承接进一步确认原因。</li></ul>",
            "<h2>主动收入</h2>",
            table(["指标", f"2026年{target_month}月", f"2026年{comparison_month}月", "环比/变化"], [
                ["主动收入", money(active["value"]), money(active["comparison"]), mom(active)],
                ["主动退费金额", money(active_refund["value"]), money(active_refund["comparison"]), mom(active_refund)],
                ["主动退费后收入", money(active_net["value"]), money(active_net["comparison"]), mom(active_net)],
                ["主动退费率", pct(active_refund_rate["value"]), pct(active_refund_rate["comparison"]), pct_point(active_refund_rate)],
            ]),
            f"<ul><li>{target_month}月主动收入 <b>{money(active['value'])}</b>，主动退费后收入 <b>{money(active_net['value'])}</b>。</li><li>主动退费后收入环比{comparison_month}月增长 <b>{mom_abs(active_net)}</b>。</li><li>主动退费率 <b>{pct(active_refund_rate['value'])}</b>，{comparison_month}月为 <b>{pct(active_refund_rate['comparison'])}</b>，变化 <b>{pct_point(active_refund_rate)}</b>。</li></ul>",
            "<h2>续费收入</h2>",
            table(["指标", f"2026年{target_month}月", f"2026年{comparison_month}月", "环比/变化"], [
                ["续费收入", money(renewal["value"]), money(renewal["comparison"]), mom(renewal)],
                ["续费退费金额", money(renewal_refund["value"]), money(renewal_refund["comparison"]), mom(renewal_refund)],
                ["续费退费后收入", money(renewal_net["value"]), money(renewal_net["comparison"]), mom(renewal_net)],
                ["续费退费率", pct(renewal_refund_rate["value"]), pct(renewal_refund_rate["comparison"]), pct_point(renewal_refund_rate)],
            ]),
            f"<ul><li>{target_month}月续费收入 <b>{money(renewal['value'])}</b>，续费退费后收入 <b>{money(renewal_net['value'])}</b>。</li><li>续费退费后收入环比{comparison_month}月增长 <b>{mom_abs(renewal_net)}</b>。</li><li>续费退费率 <b>{pct(renewal_refund_rate['value'])}</b>，变化 <b>{pct_point(renewal_refund_rate)}</b>。</li></ul>",
            "<h2>退费和客诉表现</h2>",
            table(["指标", f"2026年{target_month}月", f"2026年{comparison_month}月", "变化"], [
                ["整体退费率", pct(refund_rate["value"]), pct(refund_rate["comparison"]), pct_point(refund_rate)],
                ["主动退费率", pct(active_refund_rate["value"]), pct(active_refund_rate["comparison"]), pct_point(active_refund_rate)],
                ["续费退费率", pct(renewal_refund_rate["value"]), pct(renewal_refund_rate["comparison"]), pct_point(renewal_refund_rate)],
                ["客诉数据", "待补充", "待补充", "需接入客诉来源及完结率"],
            ]),
            f"<ul><li>{target_month}月整体退费率 <b>{pct(refund_rate['value'])}</b>，{comparison_month}月为 <b>{pct(refund_rate['comparison'])}</b>，变化 <b>{pct_point(refund_rate)}</b>。</li><li>客诉数据暂未接入完整口径，需补充外诉、内诉、完结率及平台拆分。</li></ul>",
            "<h2>报告查看对退费影响</h2>",
            table(["指标", f"2026年{target_month}月", f"2026年{comparison_month}月", "说明"], [
                ["报告查看率", "待补充", "待补充", "需确认报告查看事件和可查看用户分母"],
                ["查看后退费率", "待补充", "待补充", "需补充用户链路口径"],
            ]),
            "<ul><li>报告查看率暂未生成，需确认报告查看事件名、可查看用户分母，以及查看后退费的归因窗口。</li></ul>",
            "<h2>加购数据表现</h2>",
            table(["指标", f"2026年{target_month}月", f"2026年{comparison_month}月", "说明"], [
                ["加购收入", "待补充", "待补充", "需确认加购事件和品类字段"],
                ["加购退费后收入", "待补充", "待补充", "需确认加购退费口径"],
            ]),
            "<ul><li>加购数据暂未接入，需确认加购事件、品类字段、收入字段和退费字段。</li></ul>",
            "<h2>续费表现</h2>",
            table(["指标", f"2026年{target_month}月", f"2026年{comparison_month}月", "变化"], [
                ["解约量", count(target["cancellations"]), count(comparison["cancellations"]), direction(target["cancellations"], comparison["cancellations"])],
                ["签约发起量", count(target["signups"]), count(comparison["signups"]), direction(target["signups"], comparison["signups"])],
                ["解约率暂估", pct(cancellation_rate["value"]), pct(cancellation_rate["comparison"]), pct_point(cancellation_rate)],
                ["订单成功量", count(target["chargeSuccesses"]), count(comparison["chargeSuccesses"]), direction(target["chargeSuccesses"], comparison["chargeSuccesses"])],
                ["扣款成功率暂估", pct(charge_rate["value"]), pct(charge_rate["comparison"]), pct_point(charge_rate)],
            ]),
            f"<ul><li>{target_month}月解约量 <b>{count(target['cancellations'])}</b>，签约发起量 <b>{count(target['signups'])}</b>，解约率暂估 <b>{pct(cancellation_rate['value'])}</b>。</li><li>{target_month}月订单成功量 <b>{count(target['chargeSuccesses'])}</b>，扣款成功率暂估 <b>{pct(charge_rate['value'])}</b>。该指标当前使用订单成功量/签约发起量暂估，真实发起扣款分母需确认。</li></ul>",
            "<h2>下月重点工作</h2>",
            "<ul><li>优先复核退费金额增长原因，拆分规则调整、客诉承接、报告查看体验和用户分层影响。</li><li>补齐客诉、报告查看率、加购数据和真实扣款发起口径，避免后续复盘依赖暂估指标。</li><li>围绕主动退费率、续费退费率、扣款成功率波动制定下月跟进项，业务归因待人工确认。</li></ul>",
        ]
    )


def metric(value: float, comparison: float) -> dict[str, float | None]:
    return {"value": value, "comparison": comparison, "mom": None if comparison == 0 else (value - comparison) / comparison * 100}


def pct_metric(numerator: float, denominator: float, comparison_numerator: float, comparison_denominator: float) -> dict[str, float | None]:
    value = None if denominator == 0 else numerator / denominator * 100
    comparison = None if comparison_denominator == 0 else comparison_numerator / comparison_denominator * 100
    return {"value": value, "comparison": comparison, "mom": None if value is None or comparison is None else value - comparison}


def table(headers: list[str], rows: list[list[str]]) -> str:
    head = "".join(f"<th>{esc(header)}</th>" for header in headers)
    body = "".join("<tr>" + "".join(f"<td>{format_table_cell(cell)}</td>" for cell in row) + "</tr>" for row in rows)
    return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def format_table_cell(cell: str) -> str:
    if is_positive_delta(cell):
        return f'<span text-color="red">{esc(cell)}</span>'
    if is_negative_delta(cell):
        return f'<span text-color="green">{esc(cell)}</span>'
    return esc(cell)


def is_positive_delta(value: str) -> bool:
    return value.startswith("+") and (value.endswith("%") or value.endswith("pct"))


def is_negative_delta(value: str) -> bool:
    return value.startswith("-") and (value.endswith("%") or value.endswith("pct"))


def money(value: float | None) -> str:
    return "待补充" if value is None else f"{value / 10000:,.2f}w"


def count(value: float | None) -> str:
    return "待补充" if value is None else f"{value / 10000:,.2f}w"


def pct(value: float | None) -> str:
    return "待补充" if value is None else f"{value:.2f}%"


def mom(metric_value: dict[str, float | None]) -> str:
    value = metric_value["mom"]
    return "待确认" if value is None else f"{value:+.2f}%"


def mom_abs(metric_value: dict[str, float | None]) -> str:
    value = metric_value["mom"]
    return "待确认" if value is None else f"{abs(value):.2f}%"


def pct_point(metric_value: dict[str, float | None]) -> str:
    value = metric_value["mom"]
    return "待确认" if value is None else f"{value:+.2f}pct"


def direction(value: float, comparison: float) -> str:
    if value > comparison:
        return "上升"
    if value < comparison:
        return "下降"
    return "持平"


def esc(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")


if __name__ == "__main__":
    main()
