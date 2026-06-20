from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

try:
    from rangersdk import RangersClient
except ImportError as exc:
    raise SystemExit("rangersdk is required to query DataFinder") from exc


COMPANY_FIELD = "$_vp_alis_name"
AMOUNT_FIELD = "amount"
DEFAULT_LIMIT = 2000
TIMEZONE = "Asia/Shanghai"


def main() -> None:
    args = parse_args()
    config = load_config()
    client = RangersClient(config["access_key"], config["secret_key"])

    periods = build_periods(args.month)
    output: dict[str, Any] = {
        "companyShortName": args.company,
        "periods": periods,
        "target": query_period(client, config["app_id"], args.company, periods["target"]),
        "comparison": query_period(client, config["app_id"], args.company, periods["comparison"]),
        "missingSections": ["rules", "complaints", "reportViews", "addOns"],
    }
    print(json.dumps(output, ensure_ascii=False, separators=(",", ":")))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Query DataFinder data for a monthly operation review.")
    parser.add_argument("--company", required=True, help="Enterprise short name, matching $_vp_alis_name display value.")
    parser.add_argument("--month", required=True, help="Target month in YYYY-MM format.")
    return parser.parse_args()


def load_config() -> dict[str, str]:
    script_config = Path(__file__).resolve().parents[1] / ".env"
    if script_config.exists():
        for line in script_config.read_text(encoding="utf-8-sig").splitlines():
            if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))

    skill_config = Path("C:/Users/Administrator/.agents/skills/volcengine-datafinder/config.json")
    file_config: dict[str, str] = {}
    if skill_config.exists():
        file_config = json.loads(skill_config.read_text(encoding="utf-8"))

    config = {
        "app_id": os.getenv("DATAFINDER_APP_ID") or file_config.get("app_id", ""),
        "access_key": os.getenv("DATAFINDER_ACCESS_KEY") or file_config.get("access_key", ""),
        "secret_key": os.getenv("DATAFINDER_SECRET_KEY") or file_config.get("secret_key", ""),
    }
    missing = [key for key, value in config.items() if not value]
    if missing:
        raise SystemExit(f"Missing DataFinder config: {', '.join(missing)}")
    return config


def build_periods(month: str) -> dict[str, dict[str, Any]]:
    target_start = datetime.strptime(month, "%Y-%m")
    comparison_start = add_months(target_start, -1)
    return {
        "target": describe_month(target_start),
        "comparison": describe_month(comparison_start),
    }


def add_months(value: datetime, months: int) -> datetime:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return datetime(year, month, 1)


def describe_month(start: datetime) -> dict[str, Any]:
    end_exclusive = add_months(start, 1)
    end_inclusive = end_exclusive - timedelta(days=1)
    return {
        "start": start.strftime("%Y-%m-%d"),
        "end": end_inclusive.strftime("%Y-%m-%d"),
        "startTs": int(start.timestamp()),
        "endTs": int(end_exclusive.timestamp()),
        "label": f"{start.year}年{start.month:02d}月",
        "days": end_inclusive.day,
    }


def query_period(client: RangersClient, app_id: str, company: str, period: dict[str, Any]) -> dict[str, float]:
    return {
        "grossIncome": query_amount(client, app_id, company, period, "order_suc_back"),
        "refundAmount": query_amount(client, app_id, company, period, "refund_back"),
        "activeIncome": query_amount(client, app_id, company, period, "order_suc_back", "active"),
        "activeRefundAmount": query_amount(client, app_id, company, period, "refund_back", "active"),
        "renewalIncome": query_amount(client, app_id, company, period, "order_suc_back", "renewal"),
        "renewalRefundAmount": query_amount(client, app_id, company, period, "refund_back", "renewal"),
        "signups": query_count(client, app_id, company, period, "renew_plan_back"),
        "cancellations": query_count(client, app_id, company, period, "renew_cancel_back"),
        "chargeAttempts": query_count(client, app_id, company, period, "renew_plan_back"),
        "chargeSuccesses": query_count(client, app_id, company, period, "order_suc_back"),
    }


def query_amount(
    client: RangersClient,
    app_id: str,
    company: str,
    period: dict[str, Any],
    event_name: str,
    cycle_mode: str | None = None,
) -> float:
    result = query(client, app_id, period, event_name, "pv", [COMPANY_FIELD, AMOUNT_FIELD], cycle_mode)
    total = 0.0
    for row in data_items(result):
        if group_value(row, COMPANY_FIELD) != company:
            continue
        amount = parse_float(group_value(row, AMOUNT_FIELD))
        count = parse_float(row.get("sum"))
        if amount is not None and count is not None:
            total += amount * count
    return round(total, 2)


def query_count(
    client: RangersClient,
    app_id: str,
    company: str,
    period: dict[str, Any],
    event_name: str,
    cycle_mode: str | None = None,
) -> float:
    result = query(client, app_id, period, event_name, "pv", [COMPANY_FIELD], cycle_mode)
    total = 0.0
    for row in data_items(result):
        if group_value(row, COMPANY_FIELD) != company:
            continue
        count = parse_float(row.get("sum"))
        if count is not None:
            total += count
    return round(total, 2)


def query(
    client: RangersClient,
    app_id: str,
    period: dict[str, Any],
    event_name: str,
    indicator: str,
    groups: list[str],
    cycle_mode: str | None,
) -> dict[str, Any]:
    query_obj = {
        "event_name": event_name,
        "event_type": "origin",
        "show_name": f"{event_name} monthly review",
        "groups_v2": [group_spec(group) for group in groups],
        "filters": cycle_filters(cycle_mode),
        "show_label": "A",
        "event_indicator": indicator,
        "measure_info": {},
    }
    body = {
        "version": 3,
        "app_ids": [int(app_id)],
        "use_app_cloud_id": True,
        "periods": [
            {
                "granularity": "day",
                "type": "range",
                "range": [period["startTs"], period["endTs"]],
                "timezone": TIMEZONE,
            }
        ],
        "content": {
            "query_type": "event",
            "profile_groups_v2": [],
            "profile_filters": [],
            "orders": [],
            "queries": [[query_obj]],
            "option": {"refresh_cache": False, "fusion": False},
            "page": {"limit": DEFAULT_LIMIT},
        },
    }
    response = client.data_finder("/openapi/v1/analysis", method="POST", body=json.dumps(body, ensure_ascii=False))
    payload = response.json()
    failures = [
        item
        for item in payload.get("data", [])
        if isinstance(item, dict) and item.get("result_status") == "FAIL"
    ]
    if failures:
        raise RuntimeError(f"DataFinder query failed for {event_name}: {failures[0].get('error_message')}")
    return payload


def group_spec(name: str) -> dict[str, str]:
    if name.startswith("$_vp_"):
        return {"property_compose_type": "virtual", "property_name": name, "property_type": "common_param"}
    return {"property_compose_type": "origin", "property_name": name, "property_type": "event_param"}


def cycle_filters(mode: str | None) -> list[dict[str, Any]]:
    if mode is None:
        return []
    if mode == "renewal":
        return [{"expression": {"logic": "and", "conditions": [condition("cycle", "gt", [0], "int")]}}]
    if mode == "active":
        return [
            {
                "expression": {
                    "logic": "or",
                    "conditions": [
                        condition("cycle", "is_null", [], "int"),
                        condition("cycle", "eq", [0], "int"),
                    ],
                }
            }
        ]
    raise ValueError(f"Unsupported cycle mode: {mode}")


def condition(name: str, operation: str, values: list[Any], value_type: str) -> dict[str, Any]:
    return {
        "property_value_type": value_type,
        "property_name": name,
        "property_operation": operation,
        "property_values": values,
        "property_type": "event_param",
    }


def data_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for block in payload.get("data", []):
        if isinstance(block, dict) and isinstance(block.get("data_item_list"), list):
            rows.extend(row for row in block["data_item_list"] if isinstance(row, dict))
    return rows


def group_value(row: dict[str, Any], field: str) -> Any:
    params = row.get("group_params")
    if not isinstance(params, list):
        return None
    for param in params:
        if isinstance(param, dict) and param.get("property_name") == field:
            return param.get("origin_value") or param.get("value") or param.get("display_value")
    return None


def parse_float(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str) and value.strip():
        try:
            return float(value)
        except ValueError:
            return None
    return None


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        raise
