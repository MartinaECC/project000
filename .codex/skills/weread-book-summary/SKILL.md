---
name: weread-book-summary
description: Read and summarize books from WeRead/微信读书 links. Use when the user gives a weread.qq.com reader URL, says to read a WeRead/微信读书 book, asks to use their Chrome membership/login to read a book, or wants a book summary, chapter summary, action checklist, or team playbook based on a WeRead book.
---

# WeRead Book Summary

## Overview

Use this skill to read a WeRead book through the user's Chrome login state and produce a compliant summary, action checklist, or implementation-oriented document. Prefer Chrome over public web fetch when the user says they have membership, are logged in, or asks to use their browser.

Do not bypass paywalls, DRM, login prompts, or access controls. Use only content visible through the user's authorized browser session. Summarize and transform; do not reproduce long verbatim book text.

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

## Summary Outputs

Choose the output shape from the user's request:

- **普通读书总结**: one-sentence thesis, chapter-by-chapter takeaways, key methods, recommended audience.
- **行动清单**: principles, 30/60/90-day plan, checklists, role/responsibility boundaries, metrics, review template.
- **团队方法论文档**: title, opening principle, structured sections, tables/checklists, and concrete first-week actions.
- **Feishu/Lark document output**: if the user asks to create a Feishu child document, use `lark-wiki` to create the child node and `lark-doc` to write XML content.

## Compliance Rules

- Do not provide the full book text or lengthy verbatim excerpts.
- Keep direct quotations short and only when necessary.
- It is acceptable to summarize, synthesize, classify, extract methods, and convert ideas into original checklists or playbooks.
- If only public metadata/trial pages are available, explicitly say the summary is based on limited visible content.
- Do not inspect Chrome cookies, passwords, local storage, or account secrets.

## Useful Signals From Prior WeRead Sessions

- WeRead public HTML may expose `window.__INITIAL_STATE__` with title, author, chapter list, word count, rating, and trial limits.
- The reader often renders body text outside ordinary `document.body.innerText`; screenshots are the reliable fallback.
- A full authorized reading session can be verified by reaching an `已读完` page and seeing reading time/recommendation controls.
- For the book `管理者如何带团队用 AI（轻科技）`, the successful full-read workflow used Chrome membership state, sequential `下一页` clicks, screenshot reading, and stopped at `已读完`.
