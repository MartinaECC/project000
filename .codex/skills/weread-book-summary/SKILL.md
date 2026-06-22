---
name: weread-book-summary
description: Read WeRead/微信读书 books and turn them into compliant summaries, action checklists, team playbooks, or KnowledgeBase method-note documents with an index entry. Use when the user gives a weread.qq.com reader URL, says to read a WeRead/微信读书 book, asks to use Chrome membership/login, wants a richer book note that helps someone who has not read the book know what to do, asks to write the resulting reading note into E:\KnowledgeBase, or asks to maintain the KB reading-note index.
---

# WeRead Book Summary

## Overview

Use this skill to read a WeRead book through the user's Chrome login state and produce a compliant summary, action checklist, implementation-oriented document, or KnowledgeBase reading note. Prefer Chrome over public web fetch when the user says they have membership, are logged in, or asks to use their browser.

Do not bypass paywalls, DRM, login prompts, or access controls. Use only content visible through the user's authorized browser session. Summarize and transform; do not reproduce long verbatim book text.

Default for this user: when they send a WeRead link and ask to read/summarize the book, produce a practical Chinese method-note that helps someone who has not read the book understand the thesis, key concepts, chapter logic, and concrete next actions. When the user asks to write it into KB/KnowledgeBase, save it under `E:\KnowledgeBase\30-Resources\读书笔记\`.

## Workflow

1. If the user provided a WeRead URL, treat it as the source of truth. Do not keep searching local files unless the user explicitly provides a local copy.
2. Use the `chrome:control-chrome` skill when existing login/member state matters. Claim an already-open WeRead tab if present; otherwise open the URL in Chrome.
3. Inspect the page state:
   - If the page is logged out or blocked by a QR/login prompt, ask the user to log in and stop.
   - If the page only exposes public metadata or trial pages, state that access is limited and summarize only what is visible.
   - If the page shows membership/full-reading state, continue.
4. Try DOM text extraction first, but expect WeRead reader body text to be partially protected or rendered visually. If body text only contains navigation/sidebar text, switch to screenshot reading.
5. Read sequentially:
   - Start from the current reader page or navigate to the first readable page if needed.
   - Capture a screenshot of each visible two-page spread.
   - Click `下一页` after each page/spread.
   - Track chapter titles from the page title and visible headings.
   - Stop only when the reader reaches `已读完`, no next button remains, or access is blocked.
6. While reading, take concise notes by chapter and theme. Avoid storing or outputting full paragraphs.
7. Release/finalize the Chrome tab when done, keeping the user's tab open if it is their existing tab.

## Method-Note Output Pattern

For this user's KB-oriented reading notes, write in Chinese and transform the book into an operating method rather than a plain summary. Use this structure unless the user asks otherwise:

1. **这本书真正可用的东西**: a clear judgment of the book's business or work value, written for someone who has not read it.
2. **核心概念白话版**: explain the book's important concepts in plain language, with relationships between concepts.
3. **章节导读**: group the table of contents into logical blocks; for each block, explain what it contributes and what to remember.
4. **方法论模型**: convert the book into reusable steps, frameworks, templates, or decision rules.
5. **优先落地场景**: adapt the book to the user's company-operating context, especially customer risk, daily/weekly reports, meetings, knowledge capture, SOP checks, product/tech/operations collaboration, and governance.
6. **30 / 60 / 90 天行动路线**: provide staged implementation actions, acceptance criteria, and review points.
7. **避坑清单**: list practical failure modes and boundaries.
8. **今天 / 本周 / 本月行动**: end with concrete next actions.
9. **后续咨询调用模板**: add prompts/checklists the user can reuse later.
10. **一句可复用原则**: close with the core principle in one memorable sentence.

Use a company-wide lens when relevant: strategy, market, product, operations, technology, HR, administration, finance, and legal. Treat customer risk as the first entry point when the book can support operating-system improvements.

## Summary Outputs

Choose the output shape from the user's request:

- **普通读书总结**: one-sentence thesis, chapter-by-chapter takeaways, key methods, recommended audience.
- **行动清单**: principles, 30/60/90-day plan, checklists, role/responsibility boundaries, metrics, review template.
- **团队方法论文档**: title, opening principle, structured sections, tables/checklists, and concrete first-week actions.
- **KnowledgeBase 方法论读书笔记**: Obsidian-compatible Markdown with YAML metadata, source links, related local links, method sections, staged actions, and reusable consultation templates.
- **Feishu/Lark document output**: if the user asks to create a Feishu child document, use `lark-wiki` to create the child node and `lark-doc` to write XML content.

## KnowledgeBase Writing

When the user asks to write the note into KB/KnowledgeBase:

1. Inspect `E:\KnowledgeBase\30-Resources\读书笔记\` and reuse its existing note style.
2. Create one Markdown file named `<书名> - <作者>.md`. Use exact Chinese book title and author names from the visible WeRead page when available.
3. Add YAML frontmatter:
   - `title`, `author`, `category`, `source: 微信读书`, `weread`, `created`, `updated`, `note_type`
   - Add `related` Obsidian links when the note relates to existing KnowledgeBase areas, such as `Codex 合伙人咨询师操作原则`, `AI 团队协作机制`, `客户风险雷达`, or `运营负责人 AI 协作驾驶舱`.
4. Store only desensitized summaries, methods, frameworks, and action plans. Do not store raw customer chats, sensitive files, secrets, QR codes, tokens, or long copyrighted excerpts.
5. Update `E:\KnowledgeBase\30-Resources\读书笔记\读书笔记索引.md` after creating or updating a note:
   - Use columns exactly: `标题 | 作者 | 登记时间 | 微信读书链接 | 读书笔记链接`.
   - Use the note YAML `created` value as `登记时间`; if absent, use today's date in `YYYY-MM-DD`.
   - Use the WeRead URL from the note YAML `weread` field.
   - Use Obsidian links without aliases inside Markdown tables, for example `[[30-Resources/读书笔记/书名 - 作者]]`. Do not use `[[path|alias]]` in table cells because the pipe splits the Markdown table.
   - If an entry for the same title or note link already exists, update that row instead of adding a duplicate.
6. After writing, verify the note file exists, preview the top metadata, verify the index row, and check `git -C E:\KnowledgeBase status --short`. Mention unrelated existing dirty files without modifying them.

## Compliance Rules

- Do not provide the full book text or lengthy verbatim excerpts.
- Keep direct quotations short and only when necessary.
- It is acceptable to summarize, synthesize, classify, extract methods, and convert ideas into original checklists or playbooks.
- If only public metadata/trial pages are available, explicitly say the summary is based on limited visible content.
- Do not inspect Chrome cookies, passwords, local storage, or account secrets.
- If the book is too long to read fully in one turn, read the visible metadata, table of contents, introduction/conclusion where accessible, and representative key chapters; clearly state the coverage and avoid pretending to have read inaccessible pages.

## Useful Signals From Prior WeRead Sessions

- WeRead public HTML may expose `window.__INITIAL_STATE__` with title, author, chapter list, word count, rating, and trial limits.
- The reader often renders body text outside ordinary `document.body.innerText`; screenshots are the reliable fallback.
- A full authorized reading session can be verified by reaching an `已读完` page and seeing reading time/recommendation controls.
- For the book `管理者如何带团队用 AI（轻科技）`, the successful full-read workflow used Chrome membership state, sequential `下一页` clicks, screenshot reading, and stopped at `已读完`.
- For the book `Skills+OpenClaw：从零打造个性化AI助理`, the useful KB note pattern was: explain Skills/OpenClaw in plain language, convert chapters into method blocks, propose company Skill candidates, give a 30/60/90-day route, and write the final Markdown to `E:\KnowledgeBase\30-Resources\读书笔记\`.
- The KB reading-note index lives at `E:\KnowledgeBase\30-Resources\读书笔记\读书笔记索引.md`; keep it updated with title, author, registration date, WeRead link, and note link whenever a KB reading note is created or updated.
