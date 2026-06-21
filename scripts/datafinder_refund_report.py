from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

try:
    from rangersdk import RangersClient
except ImportError as exc:
    raise SystemExit("rangersdk is required to query DataFinder") from exc


DEFAULT_TIMEZONE = "Asia/Shanghai"
COMPANY_FIELD = "$_vp_alis_name"
INCOME_EVENT = "order_suc_back"
REFUND_EVENT = "refund_back"
AMOUNT_FIELD = "amount"
CYCLE_FIELD = "cycle"
MAX_PAGE_SIZE = 2000


def main() -> None:
    load_env_file()
    app_id = require_env("DATAFINDER_APP_ID")
    access_key = require_env("DATAFINDER_ACCESS_KEY")
    secret_key = require_env("DATAFINDER_SECRET_KEY")
    domain = os.getenv("DATAFINDER_DOMAIN", "analytics.volcengineapi.com")
    timezone_name = os.getenv("REFUND_REPORT_TIMEZONE", DEFAULT_TIMEZONE)

    periods = report_periods(timezone_name)
    client = RangersClient(access_key, secret_key, 1800, domain)
    current = load_period_data(client, app_id, periods["current"], timezone_name)
    baseline = load_period_data(client, app_id, periods["baseline"], timezone_name)
    previous_full_day = load_period_data(client, app_id, periods["previousFullDay"], timezone_name)
    yesterday_full_day = load_period_data(client, app_id, periods["yesterdayFullDay"], timezone_name)

    output = {
        "rows": current["rows"],
        "diagnostics": current["diagnostics"],
        "baselineRows": baseline["rows"],
        "baselineDiagnostics": baseline["diagnostics"],
        "previousFullDayRows": previous_full_day["rows"],
        "previousFullDayDiagnostics": previous_full_day["diagnostics"],
        "yesterdayFullDayRows": yesterday_full_day["rows"],
        "yesterdayFullDayDiagnostics": yesterday_full_day["diagnostics"],
        "periods": {
            name: {
                "start": period["start"].isoformat(),
                "end": period["end"].isoformat(),
            }
            for name, period in periods.items()
        },
    }
    print(json.dumps(output, ensure_ascii=True, separators=(",", ":")))


def load_env_file(path: str = ".env") -> None:
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8-sig") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, value = line.split("=", 1)
            os.environ.setdefault(name.strip(), value.strip().strip('"').strip("'"))


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"{name} is required")
    return value


def report_periods(timezone_name: str) -> dict[str, dict[str, datetime]]:
    tz = ZoneInfo(timezone_name)
    now = parse_now(tz)
    current_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    current_end = now.replace(minute=0, second=0, microsecond=0)
    previous_full_day_start = current_start - timedelta(days=2)
    previous_full_day_end = current_start - timedelta(days=1)
    yesterday_full_day_start = current_start - timedelta(days=1)
    yesterday_full_day_end = current_start

    if now.hour == 0:
        return {
            "current": {"start": yesterday_full_day_start, "end": yesterday_full_day_end},
            "baseline": {"start": previous_full_day_start, "end": previous_full_day_end},
            "previousFullDay": {"start": previous_full_day_start, "end": previous_full_day_end},
            "yesterdayFullDay": {"start": yesterday_full_day_start, "end": yesterday_full_day_end},
        }

    return {
        "current": {"start": current_start, "end": current_end},
        "baseline": {"start": current_start - timedelta(days=1), "end": current_end - timedelta(days=1)},
        "previousFullDay": {"start": previous_full_day_start, "end": previous_full_day_end},
        "yesterdayFullDay": {"start": yesterday_full_day_start, "end": yesterday_full_day_end},
    }


def parse_now(tz: ZoneInfo) -> datetime:
    raw = os.getenv("REFUND_REPORT_NOW_ISO")
    if not raw:
        return datetime.now(tz)
    normalized = raw.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=tz)
    return parsed.astimezone(tz)


def load_period_data(client: Any, app_id: str, period: dict[str, datetime], timezone_name: str) -> dict[str, Any]:
    query_start, query_end, query_granularity = period_query_range(period)
    income_amount = query_amount_sum_groups(client, app_id, INCOME_EVENT, query_start, query_end, timezone_name, None, query_granularity)
    c0_income_amount = query_amount_sum_groups(
        client, app_id, INCOME_EVENT, query_start, query_end, timezone_name, cycle_zero_filter(), query_granularity
    )
    refund_amount = query_amount_sum_groups(client, app_id, REFUND_EVENT, query_start, query_end, timezone_name, None, query_granularity)
    income_count = query_count_groups(client, app_id, INCOME_EVENT, query_start, query_end, timezone_name, None, query_granularity)
    refund_count = query_count_groups(client, app_id, REFUND_EVENT, query_start, query_end, timezone_name, None, query_granularity)

    return {
        "rows": build_rows(
            aggregate_metric(income_amount["groups"]),
            aggregate_metric(refund_amount["groups"]),
            aggregate_metric(income_count["groups"]),
            aggregate_metric(refund_count["groups"]),
            aggregate_metric(c0_income_amount["groups"]),
        ),
        "diagnostics": {
            "amountMetric": "measure_sum_amount",
            "incomeRows": income_amount["row_count"],
            "incomeAmountRows": income_amount["row_count"],
            "incomeCountRows": income_count["row_count"],
            "c0IncomeRows": c0_income_amount["row_count"],
            "c0IncomeAmountRows": c0_income_amount["row_count"],
            "refundRows": refund_amount["row_count"],
            "refundAmountRows": refund_amount["row_count"],
            "refundCountRows": refund_count["row_count"],
            "incomeBadRows": income_amount["bad_rows"] + income_count["bad_rows"],
            "incomeAmountBadRows": income_amount["bad_rows"],
            "incomeCountBadRows": income_count["bad_rows"],
            "c0IncomeBadRows": c0_income_amount["bad_rows"],
            "c0IncomeAmountBadRows": c0_income_amount["bad_rows"],
            "refundBadRows": refund_amount["bad_rows"] + refund_count["bad_rows"],
            "refundAmountBadRows": refund_amount["bad_rows"],
            "refundCountBadRows": refund_count["bad_rows"],
            "incomeTruncated": income_amount["is_truncated"] or income_count["is_truncated"],
            "incomeAmountTruncated": income_amount["is_truncated"],
            "incomeCountTruncated": income_count["is_truncated"],
            "c0IncomeTruncated": c0_income_amount["is_truncated"],
            "c0IncomeAmountTruncated": c0_income_amount["is_truncated"],
            "refundTruncated": refund_amount["is_truncated"] or refund_count["is_truncated"],
            "refundAmountTruncated": refund_amount["is_truncated"],
            "refundCountTruncated": refund_count["is_truncated"],
            "incomeGranularity": income_amount["granularity"],
            "incomeAmountGranularity": income_amount["granularity"],
            "incomeCountGranularity": income_count["granularity"],
            "c0IncomeGranularity": c0_income_amount["granularity"],
            "c0IncomeAmountGranularity": c0_income_amount["granularity"],
            "refundGranularity": refund_amount["granularity"],
            "refundAmountGranularity": refund_amount["granularity"],
            "refundCountGranularity": refund_count["granularity"],
            "queryStart": query_start.isoformat(),
            "queryEnd": query_end.isoformat(),
            "queryGranularity": query_granularity,
        },
    }


def query_amount_sum_groups(
    client: Any,
    app_id: str,
    event_name: str,
    start: datetime,
    end: datetime,
    timezone_name: str,
    filters: list[dict[str, Any]] | None = None,
    granularity: str | None = None,
) -> dict[str, Any]:
    return query_metric_groups(
        client,
        app_id,
        event_name,
        start,
        end,
        timezone_name,
        "measure",
        {
            "measure_type": "sum",
            "property_name": AMOUNT_FIELD,
            "property_type": "event_param",
        },
        filters,
        f"{event_name} amount sum",
        granularity,
    )


def query_count_groups(
    client: Any,
    app_id: str,
    event_name: str,
    start: datetime,
    end: datetime,
    timezone_name: str,
    filters: list[dict[str, Any]] | None = None,
    granularity: str | None = None,
) -> dict[str, Any]:
    return query_metric_groups(client, app_id, event_name, start, end, timezone_name, "events", {}, filters, f"{event_name} count", granularity)


def query_metric_groups(
    client: Any,
    app_id: str,
    event_name: str,
    start: datetime,
    end: datetime,
    timezone_name: str,
    event_indicator: str,
    measure_info: dict[str, Any],
    filters: list[dict[str, Any]] | None,
    show_name: str,
    granularity: str | None = None,
) -> dict[str, Any]:
    query = {
        "event_name": event_name,
        "event_type": "origin",
        "show_name": show_name,
        "groups_v2": [
            {"property_compose_type": "virtual", "property_name": COMPANY_FIELD, "property_type": "common_param"},
        ],
        "filters": filters or [],
        "show_label": "A",
        "event_indicator": event_indicator,
        "measure_info": measure_info,
    }
    granularity = granularity or period_granularity(start, end)
    range_start, range_end = day_query_range(start, end, granularity)
    body = {
        "version": 3,
        "app_ids": [int(app_id)],
        "use_app_cloud_id": True,
        "periods": [
            {
                "granularity": granularity,
                "type": "range",
                "range": [int(range_start.timestamp()), int(range_end.timestamp())],
                "timezone": timezone_name,
            }
        ],
        "content": {
            "query_type": "event",
            "profile_groups_v2": [],
            "profile_filters": [],
            "orders": [],
            "queries": [[query]],
            "option": {"refresh_cache": False, "fusion": False},
            "page": {"limit": MAX_PAGE_SIZE},
        },
    }
    response = client.data_finder("/openapi/v1/analysis", method="POST", body=json.dumps(body))
    payload = response.json()
    groups, bad_rows, row_count, is_truncated = extract_metric_groups(payload)
    return {"groups": groups, "bad_rows": bad_rows, "row_count": row_count, "is_truncated": is_truncated, "granularity": granularity}


def period_query_range(period: dict[str, datetime]) -> tuple[datetime, datetime, str]:
    start = period["start"]
    end = period["end"]
    if is_full_day_window(start, end):
        return start, start, "day"
    return start, end, period_granularity(start, end)


def day_query_range(start: datetime, end: datetime, granularity: str) -> tuple[datetime, datetime]:
    if granularity == "day" and is_full_day_window(start, end):
        return start, start
    return start, end


def cycle_zero_filter() -> list[dict[str, Any]]:
    return [
        {
            "expression": {
                "logic": "and",
                "conditions": [
                    {
                        "property_value_type": "int",
                        "property_name": CYCLE_FIELD,
                        "property_operation": "eq",
                        "property_values": [0],
                        "property_type": "event_param",
                    }
                ],
            }
        }
    ]


def period_granularity(start: datetime, end: datetime) -> str:
    return "day" if is_full_day_window(start, end) else "hour"


def is_full_day_window(start: datetime, end: datetime) -> bool:
    return (
        end - start == timedelta(days=1)
        and start.hour == 0
        and start.minute == 0
        and start.second == 0
        and end.hour == 0
        and end.minute == 0
        and end.second == 0
    )


def extract_groups(payload: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], int, bool]:
    groups: list[dict[str, Any]] = []
    bad_rows: list[dict[str, Any]] = []
    blocks = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(blocks, list):
        return groups, [{"reason": "missing data", "payload": payload}], 0, False

    is_truncated = False
    row_count = 0
    for block in blocks:
        if not isinstance(block, dict):
            continue
        is_truncated = is_truncated or bool(block.get("is_truncated"))
        rows = block.get("data_item_list")
        if not isinstance(rows, list):
            continue
        row_count += len(rows)
        for row in rows:
            parsed = parse_group_row(row)
            if parsed.get("ok"):
                groups.append(parsed["group"])
            else:
                bad_rows.append(parsed["bad_row"])

    return groups, bad_rows, row_count, is_truncated or row_count >= MAX_PAGE_SIZE


def extract_metric_groups(payload: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], int, bool]:
    groups: list[dict[str, Any]] = []
    bad_rows: list[dict[str, Any]] = []
    blocks = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(blocks, list):
        return groups, [{"reason": "missing data", "payload": payload}], 0, False

    is_truncated = False
    row_count = 0
    for block in blocks:
        if not isinstance(block, dict):
            continue
        is_truncated = is_truncated or bool(block.get("is_truncated"))
        rows = block.get("data_item_list")
        if not isinstance(rows, list):
            continue
        row_count += len(rows)
        for row in rows:
            parsed = parse_metric_row(row)
            if parsed.get("ok"):
                groups.append(parsed["group"])
            else:
                bad_rows.append(parsed["bad_row"])

    return groups, bad_rows, row_count, is_truncated or row_count >= MAX_PAGE_SIZE


def parse_group_row(row: Any) -> dict[str, Any]:
    if not isinstance(row, dict):
        return {"ok": False, "bad_row": {"reason": "row is not an object", "row": row}}

    company = None
    amount_raw = None
    params = row.get("group_params")
    if isinstance(params, list):
        for param in params:
            if not isinstance(param, dict):
                continue
            name = param.get("property_name")
            if name == COMPANY_FIELD:
                company = first_non_empty(param.get("display_value"), param.get("value"))
            elif name == AMOUNT_FIELD:
                amount_raw = first_non_empty(param.get("display_value"), param.get("value"))

    count = extract_count(row)
    try:
        amount = float(amount_raw)
    except (TypeError, ValueError):
        return {"ok": False, "bad_row": {"reason": "amount is not numeric", "company": company, "amount": amount_raw}}

    if not company or count is None:
        return {"ok": False, "bad_row": {"reason": "missing company or count", "company": company, "amount": amount_raw, "count": count}}

    return {"ok": True, "group": {"company": str(company), "amount": amount, "count": count}}


def parse_metric_row(row: Any) -> dict[str, Any]:
    if not isinstance(row, dict):
        return {"ok": False, "bad_row": {"reason": "row is not an object", "row": row}}

    company = None
    params = row.get("group_params")
    if isinstance(params, list):
        for param in params:
            if not isinstance(param, dict):
                continue
            if param.get("property_name") == COMPANY_FIELD:
                company = first_non_empty(param.get("display_value"), param.get("value"))

    value = extract_count(row)
    if not company or value is None:
        return {"ok": False, "bad_row": {"reason": "missing company or value", "company": company, "value": value}}

    return {"ok": True, "group": {"company": str(company), "value": value}}


def first_non_empty(*values: Any) -> Any:
    for value in values:
        if value is not None and value != "":
            return value
    return None


def extract_count(row: dict[str, Any]) -> float | None:
    data = row.get("data")
    if isinstance(data, list) and data:
        total = 0.0
        seen_numeric = False
        for value in data:
            try:
                number = float(value)
            except (TypeError, ValueError):
                continue
            total += number
            seen_numeric = True
        return total if seen_numeric else None
    for key in ("value", "count"):
        value = row.get(key)
        if isinstance(value, (int, float)):
            return float(value)
    return None


def aggregate_amount(groups: list[dict[str, Any]]) -> dict[str, float]:
    totals: dict[str, float] = {}
    for group in groups:
        company = str(group["company"])
        totals[company] = totals.get(company, 0.0) + float(group["amount"]) * float(group["count"])
    return totals


def aggregate_count(groups: list[dict[str, Any]]) -> dict[str, float]:
    totals: dict[str, float] = {}
    for group in groups:
        company = str(group["company"])
        totals[company] = totals.get(company, 0.0) + float(group["count"])
    return totals


def aggregate_metric(groups: list[dict[str, Any]]) -> dict[str, float]:
    totals: dict[str, float] = {}
    for group in groups:
        company = str(group["company"])
        totals[company] = totals.get(company, 0.0) + float(group["value"])
    return totals


def build_rows(
    income: dict[str, float],
    refund: dict[str, float],
    income_counts: dict[str, float],
    refund_counts: dict[str, float],
    c0_income: dict[str, float],
) -> list[dict[str, Any]]:
    rows = []
    for company in sorted(set(income) | set(refund)):
        income_amount = round(income.get(company, 0.0), 2)
        refund_amount = round(refund.get(company, 0.0), 2)
        if income_amount == 0 and refund_amount == 0:
            continue
        refund_rate = None if income_amount <= 0 else refund_amount / income_amount * 100
        rows.append(
            {
                "company": company,
                "incomeAmount": income_amount,
                "refundAmount": refund_amount,
                "incomeCount": round(income_counts.get(company, 0.0), 2),
                "refundCount": round(refund_counts.get(company, 0.0), 2),
                "c0IncomeAmount": round(c0_income.get(company, 0.0), 2),
                "refundRate": refund_rate,
            }
        )
    rows.sort(key=lambda row: (-row["refundAmount"], -(row["refundRate"] if row["refundRate"] is not None else float("inf")), row["company"]))
    return rows


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=True), file=sys.stderr)
        raise
