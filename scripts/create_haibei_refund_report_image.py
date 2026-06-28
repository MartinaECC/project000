from __future__ import annotations

from pathlib import Path
import pandas as pd
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"E:\Workspace_codex\project000")
SOURCE = Path(r"C:\Users\Administrator\Desktop\企业日报_还呗退费挽留监控_20260520.xlsx")
OUT_DIR = ROOT / "outputs" / "haibei_refund_report"
OUT = OUT_DIR / "haibei_refund_test_summary_portrait.png"

W, H = 1080, 1920
BG = "#F6F8FB"
INK = "#182230"
MUTED = "#667085"
LINE = "#D9E2EC"
NAVY = "#0B1F3A"
BLUE = "#1D4ED8"
BLUE_DEEP = "#1E3A8A"
BLUE_MID = "#2563EB"
BLUE_SKY = "#0284C7"
BLUE_SOFT = "#60A5FA"
BLUE_PALE = "#DBEAFE"
BLUE_TINT = "#EFF6FF"
RISK_RED = "#C1121F"
CARD = "#FFFFFF"


def font(size: int, bold: bool = False, light: bool = False) -> ImageFont.FreeTypeFont:
    if bold:
        path = r"C:\Windows\Fonts\msyhbd.ttc"
    elif light:
        path = r"C:\Windows\Fonts\msyhl.ttc"
    else:
        path = r"C:\Windows\Fonts\msyh.ttc"
    return ImageFont.truetype(path, size)


F = {
    "title": font(50, True),
    "h1": font(34, True),
    "h1_small": font(31, True),
    "h2": font(28, True),
    "h3": font(24, True),
    "body": font(22),
    "small": font(18),
    "tiny": font(16),
    "num": font(46, True),
    "num_big": font(58, True),
}


def rounded(draw: ImageDraw.ImageDraw, box, r=18, fill=CARD, outline=None, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def text(draw, xy, s, fnt, fill=INK, anchor=None, align="left"):
    draw.text(xy, s, font=fnt, fill=fill, anchor=anchor, align=align)


def wrap(draw, s: str, fnt, max_width: int):
    lines = []
    for paragraph in s.split("\n"):
        line = ""
        for ch in paragraph:
            candidate = line + ch
            if draw.textlength(candidate, font=fnt) <= max_width or not line:
                line = candidate
            else:
                lines.append(line)
                line = ch
        if line:
            lines.append(line)
    return lines


def draw_wrapped(draw, xy, s: str, fnt, max_width: int, fill=INK, line_gap=9):
    x, y = xy
    for line in wrap(draw, s, fnt, max_width):
        text(draw, (x, y), line, fnt, fill)
        y += fnt.size + line_gap
    return y


def metric_card(draw, box, label, value, note, accent):
    rounded(draw, box, r=22, fill=CARD, outline="#E6ECF2")
    x1, y1, x2, y2 = box
    draw.rounded_rectangle((x1, y1, x1 + 10, y2), radius=22, fill=accent)
    text(draw, (x1 + 32, y1 + 28), label, F["body"], MUTED)
    text(draw, (x1 + 32, y1 + 68), value, F["num_big"], accent)
    text(draw, (x1 + 32, y2 - 38), note, F["small"], MUTED)


def pct(v):
    return f"{v * 100:.2f}%"


def money(v):
    return f"{v:,.2f}"


def parse_data():
    df = pd.read_excel(SOURCE)
    # The workbook has fixed columns: date, channel, refund orders, retained orders,
    # retained order rate, failed orders, failed rate, refundable amount, actual refund,
    # retained amount, retained amount rate.
    rows = []
    for _, row in df.iloc[:2].iterrows():
        ts = row.iloc[0]
        if isinstance(ts, pd.Timestamp) or (hasattr(ts, "month") and hasattr(ts, "day")):
            date = f"{ts.month}/{ts.day}"
        elif isinstance(ts, (int, float)):
            dt = pd.to_datetime(ts, unit="ms")
            date = f"{dt.month}/{dt.day}"
        else:
            date = str(ts)
        rows.append(
            {
                "date": date,
                "orders": int(row.iloc[2]),
                "saved_orders": int(row.iloc[3]),
                "due": float(row.iloc[7]),
                "actual": float(row.iloc[8]),
                "saved_amount": float(row.iloc[9]),
                "amount_rate": float(row.iloc[10]),
                "order_rate": float(row.iloc[4]),
            }
        )
    total = df.iloc[2]
    summary = {
        "orders": int(total.iloc[2]),
        "saved_orders": int(total.iloc[3]),
        "due": float(total.iloc[7]),
        "actual": float(total.iloc[8]),
        "saved_amount": float(total.iloc[9]),
        "amount_rate": float(total.iloc[10]),
        "order_rate": float(total.iloc[4]),
    }
    return rows[::-1], summary


def draw_table(draw, x, y, rows, summary):
    headers = ["日期", "退费订单", "表观挽留单", "挽留金额", "金额挽留率"]
    col_w = [110, 150, 165, 160, 150]
    row_h = 54
    table_w = sum(col_w)
    rounded(draw, (x, y, x + table_w, y + row_h * 4 + 12), r=18, fill="#F9FBFD", outline="#E5EAF0")
    cx = x
    draw.rounded_rectangle((x, y, x + table_w, y + row_h), radius=18, fill="#EAF2FF")
    for i, h in enumerate(headers):
        text(draw, (cx + 16, y + 16), h, F["small"], BLUE)
        cx += col_w[i]
    table_rows = rows + [{
        "date": "合计",
        "orders": summary["orders"],
        "saved_orders": summary["saved_orders"],
        "saved_amount": summary["saved_amount"],
        "amount_rate": summary["amount_rate"],
    }]
    for r_i, r in enumerate(table_rows):
        yy = y + row_h * (r_i + 1)
        if r_i == len(table_rows) - 1:
            draw.rectangle((x, yy, x + table_w, yy + row_h), fill=BLUE_TINT)
        draw.line((x, yy, x + table_w, yy), fill="#E5EAF0", width=1)
        values = [r["date"], f'{r["orders"]}', f'{r["saved_orders"]}', money(r["saved_amount"]), pct(r["amount_rate"])]
        cx = x
        for i, v in enumerate(values):
            fill = INK if r_i < len(table_rows) - 1 else BLUE_DEEP
            fnt = F["body"] if r_i < len(table_rows) - 1 else F["h3"]
            text(draw, (cx + 16, yy + 14), v, fnt, fill)
            cx += col_w[i]


def draw_donut(draw, center, radius, values, colors):
    total = sum(values)
    start = -90
    bbox = (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius)
    for val, color in zip(values, colors):
        angle = 360 * val / total
        draw.pieslice(bbox, start=start, end=start + angle, fill=color)
        start += angle
    inner = radius * 0.62
    draw.ellipse((center[0] - inner, center[1] - inner, center[0] + inner, center[1] + inner), fill=CARD)
    text(draw, (center[0], center[1] - 23), "20/23", F["h1"], RISK_RED, anchor="mm")
    text(draw, (center[0], center[1] + 31), "为误点", F["body"], RISK_RED, anchor="mm")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows, summary = parse_data()
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Header
    draw.rectangle((0, 0, W, 188), fill=NAVY)
    text(draw, (60, 48), "还呗部分退费测试表现", F["title"], "#FFFFFF")
    text(draw, (62, 128), "测试时间：2026年5月20日-2026年5月21日", F["body"], "#D6E4FF")

    # Executive conclusion
    rounded(draw, (60, 224, 1020, 398), r=24, fill=CARD, outline="#E1E8F0")
    draw.rounded_rectangle((60, 224, 74, 398), radius=24, fill=BLUE_DEEP)
    text(draw, (104, 254), "核心结论", F["h2"], BLUE_DEEP)
    conclusion = "因部分退费流程引发87%误操作率，测试2日后下线迭代；预计6月通道稳定后，7月重启。"
    draw_wrapped(draw, (104, 306), conclusion, F["h1_small"], 860, INK, 12)

    # Metric cards
    y = 432
    gap = 24
    card_w = 448
    left_x, right_x = 60, 60 + card_w + gap
    metric_card(draw, (left_x, y, left_x + card_w, y + 176), "总退费订单量", f'{summary["orders"]} 单', "两日合计申请退费订单", BLUE_MID)
    metric_card(draw, (right_x, y, right_x + card_w, y + 176), "表观挽留成功量", f'{summary["saved_orders"]} 单', "其中20单为误点", BLUE_DEEP)
    metric_card(draw, (left_x, y + 200, left_x + card_w, y + 376), "挽留成功金额", money(summary["saved_amount"]), f'应退费金额 {money(summary["due"])}', BLUE_SKY)
    metric_card(draw, (right_x, y + 200, right_x + card_w, y + 376), "金额挽留率", pct(summary["amount_rate"]), "挽留成功金额 / 应退费金额", BLUE)

    # Evidence panel
    rounded(draw, (60, 844, 1020, 1218), r=24, fill=CARD, outline="#E1E8F0")
    text(draw, (96, 874), "数据表现", F["h2"], INK)
    text(draw, (96, 916), "两日退费与挽留监控", F["body"], MUTED)
    draw_table(draw, 122, 960, rows, summary)
    text(draw, (96, 1178), "注：金额挽留率为挽留成功金额 / 应退费金额；表观挽留单受误点影响，不能直接视作有效策略收益。", F["tiny"], MUTED)

    # Diagnostic panel
    rounded(draw, (60, 1250, 1020, 1646), r=24, fill=CARD, outline="#E1E8F0")
    text(draw, (96, 1280), "问题诊断", F["h2"], INK)
    text(draw, (96, 1322), "默认交互导致误点，真实挽留效果需重测", F["body"], MUTED)
    draw_donut(draw, (284, 1466), 104, [20, 3], [BLUE_DEEP, BLUE_SOFT])
    legend_x, legend_y = 118, 1590
    for label, color in [("误点：20单，占87%", BLUE_DEEP), ("推算有效挽留：3单，占13%", BLUE_SOFT)]:
        draw.rounded_rectangle((legend_x, legend_y + 4, legend_x + 24, legend_y + 28), radius=6, fill=color)
        text(draw, (legend_x + 36, legend_y), label, F["small"], INK)
        legend_y += 34

    x0, y0 = 520, 1388
    text(draw, (x0, y0), "关键影响", F["h3"], INK)
    draw_wrapped(draw, (x0, y0 + 40), "当前点击退款默认部分退费，全额退款需手动选择，造成客服误操作并触发二次进线。", F["small"], 420, MUTED, 8)
    text(draw, (x0, y0 + 150), "处理原则", F["h3"], INK)
    draw_wrapped(draw, (x0, y0 + 190), "高投诉意向或情绪激动用户，解释扣费原因后按客户需求处理，避免升级。", F["small"], 420, MUTED, 8)

    # Timeline
    rounded(draw, (60, 1680, 1020, 1854), r=24, fill="#FFFFFF", outline="#E1E8F0")
    events = [
        ("5/21晚", "暂停部分退费", BLUE_DEEP),
        ("5/28", "默认前置全部退费上线", BLUE_MID),
        ("6月初", "通道有客诉压力，暂停测试", BLUE_SKY),
        ("7月", "计划重启部分退费测试", BLUE_SOFT),
    ]
    start_x = 112
    step = 235
    yline = 1744
    draw.line((start_x + 25, yline, start_x + step * 3 + 25, yline), fill="#CAD5E2", width=4)
    for i, (date, desc, color) in enumerate(events):
        x = start_x + i * step
        draw.ellipse((x, yline - 18, x + 36, yline + 18), fill=color)
        text(draw, (x + 24, 1702), date, F["h3"], color, anchor="mm")
        draw_wrapped(draw, (x - 42, 1788), desc, F["tiny"], 145, INK, 6)

    # Export
    img.save(OUT, quality=95)
    print(str(OUT))


if __name__ == "__main__":
    main()
