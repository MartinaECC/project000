#!/usr/bin/env python3
"""Tencent Docs OpenAPI helper.

This script intentionally avoids storing secrets. Pass values as arguments or
environment variables and redirect output to your own secret store if needed.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


BASE_URL = "https://docs.qq.com"


def env_or_arg(value: str | None, env_name: str) -> str:
    resolved = value or os.environ.get(env_name)
    if not resolved:
        raise SystemExit(f"Missing required value: --{env_name.lower().replace('_', '-')} or {env_name}")
    return resolved


def print_json(data: object) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True))


def request_json(method: str, url: str, headers: dict[str, str] | None = None, body: object | None = None) -> object:
    data = None
    request_headers = dict(headers or {})
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, headers=request_headers, method=method.upper())
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            if not raw:
                return {}
            return json.loads(raw)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} {exc.reason}\n{raw}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Network error: {exc}") from exc


def cmd_auth_url(args: argparse.Namespace) -> None:
    redirect_uri = env_or_arg(args.redirect_uri, "TENCENT_DOCS_REDIRECT_URI")
    client_id = env_or_arg(args.client_id, "TENCENT_DOCS_CLIENT_ID")
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "all",
    }
    if args.state:
        params["state"] = args.state
    print(f"{BASE_URL}/oauth/v2/authorize?{urllib.parse.urlencode(params)}")


def cmd_exchange_code(args: argparse.Namespace) -> None:
    params = {
        "client_id": env_or_arg(args.client_id, "TENCENT_DOCS_CLIENT_ID"),
        "client_secret": env_or_arg(args.client_secret, "TENCENT_DOCS_CLIENT_SECRET"),
        "redirect_uri": env_or_arg(args.redirect_uri, "TENCENT_DOCS_REDIRECT_URI"),
        "grant_type": "authorization_code",
        "code": env_or_arg(args.code, "TENCENT_DOCS_CODE"),
    }
    print_json(request_json("GET", f"{BASE_URL}/oauth/v2/token?{urllib.parse.urlencode(params)}"))


def cmd_refresh(args: argparse.Namespace) -> None:
    params = {
        "client_id": env_or_arg(args.client_id, "TENCENT_DOCS_CLIENT_ID"),
        "client_secret": env_or_arg(args.client_secret, "TENCENT_DOCS_CLIENT_SECRET"),
        "grant_type": "refresh_token",
        "refresh_token": env_or_arg(args.refresh_token, "TENCENT_DOCS_REFRESH_TOKEN"),
    }
    print_json(request_json("GET", f"{BASE_URL}/oauth/v2/token?{urllib.parse.urlencode(params)}"))


def cmd_app_token(args: argparse.Namespace) -> None:
    params = {
        "client_id": env_or_arg(args.client_id, "TENCENT_DOCS_CLIENT_ID"),
        "client_secret": env_or_arg(args.client_secret, "TENCENT_DOCS_CLIENT_SECRET"),
    }
    print_json(request_json("GET", f"{BASE_URL}/oauth/v2/app-account-token?{urllib.parse.urlencode(params)}"))


def cmd_user_info(args: argparse.Namespace) -> None:
    params = {"access_token": env_or_arg(args.access_token, "TENCENT_DOCS_ACCESS_TOKEN")}
    print_json(request_json("GET", f"{BASE_URL}/oauth/v2/userinfo?{urllib.parse.urlencode(params)}"))


def parse_body(body: str | None) -> object | None:
    if body is None:
        return None
    if body.startswith("@"):
        with open(body[1:], "r", encoding="utf-8") as fh:
            return json.load(fh)
    return json.loads(body)


def cmd_request(args: argparse.Namespace) -> None:
    path = args.path if args.path.startswith("/") else f"/{args.path}"
    headers = {
        "Access-Token": env_or_arg(args.access_token, "TENCENT_DOCS_ACCESS_TOKEN"),
        "Client-Id": env_or_arg(args.client_id, "TENCENT_DOCS_CLIENT_ID"),
        "Open-Id": env_or_arg(args.open_id, "TENCENT_DOCS_OPEN_ID"),
        "Accept": "application/json",
    }
    print_json(request_json(args.method, f"{BASE_URL}{path}", headers=headers, body=parse_body(args.body)))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Tencent Docs OpenAPI helper")
    sub = parser.add_subparsers(required=True)

    auth = sub.add_parser("auth-url", help="Generate OAuth authorization URL")
    auth.add_argument("--client-id")
    auth.add_argument("--redirect-uri")
    auth.add_argument("--state")
    auth.set_defaults(func=cmd_auth_url)

    exchange = sub.add_parser("exchange-code", help="Exchange OAuth code for tokens")
    exchange.add_argument("--client-id")
    exchange.add_argument("--client-secret")
    exchange.add_argument("--redirect-uri")
    exchange.add_argument("--code")
    exchange.set_defaults(func=cmd_exchange_code)

    refresh = sub.add_parser("refresh", help="Refresh access token")
    refresh.add_argument("--client-id")
    refresh.add_argument("--client-secret")
    refresh.add_argument("--refresh-token")
    refresh.set_defaults(func=cmd_refresh)

    app_token = sub.add_parser("app-token", help="Get app-level account token")
    app_token.add_argument("--client-id")
    app_token.add_argument("--client-secret")
    app_token.set_defaults(func=cmd_app_token)

    user_info = sub.add_parser("user-info", help="Get user info and validate access token")
    user_info.add_argument("--access-token")
    user_info.set_defaults(func=cmd_user_info)

    req = sub.add_parser("request", help="Call a Tencent Docs OpenAPI endpoint")
    req.add_argument("--method", required=True)
    req.add_argument("--path", required=True)
    req.add_argument("--client-id")
    req.add_argument("--open-id")
    req.add_argument("--access-token")
    req.add_argument("--body", help="JSON string or @path/to/body.json")
    req.set_defaults(func=cmd_request)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
