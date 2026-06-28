# Design QA

Source of truth: Feishu wiki document `FCCxwH3CQixSYikw8NzcavtUnEe`.

Reference direction: Product Design option 2, Client Portfolio Matrix.

Checked on 2026-06-27:

- Desktop viewport `1440x1200`: page renders with stable left navigation, executive summary, KPI cards, dashboard table, client matrix, complaint tables, monthly project table, client detail accordion, AI progress, new product directions, and next-week priorities.
- Mobile viewport `390x844`: primary content stacks correctly, side navigation is hidden, search and client accordion remain available, table content remains horizontally scrollable inside table cards.
- Data completeness checks passed:
  - Monthly revenue comparison table contains 36 project rows.
  - Operating dashboard includes the `6月 6.1-6.26` column.
  - 京东金融 and 宜信 / 宜享花 client details include a `数据表现` section.
  - AI 智能运营 link is present.
- Aura Garden重点展示 checks passed:
  - Commercial plan link is present: `https://ocn4u1j6s1bk.feishu.cn/wiki/LZiZwNEAUiolcykgAvWc3KWknjg?from=from_copylink`.
  - Prototype demo link is present: `https://miaoda.feishu.cn/app/app_178yx8tregx`.
  - Two Aura Garden UI images load from local assets.
  - Mobile viewport has no horizontal overflow after `dvw` layout fallback.
- Build verification: `npm run build` completed successfully.

Generated evidence:

- Desktop screenshot: `qa-desktop.png`
- Mobile screenshot: `qa-mobile.png`
- Client expansion screenshot: `qa-client-expanded.png`
- Aura Garden screenshots: `qa-aura-section.png`, `qa-aura-showcase-mobile.png`

Notes:

- Full-page mobile screenshot can visually repeat sticky header content because of Chrome headless full-page capture behavior. The viewport capture and DOM checks indicate the actual page structure is not duplicated.
