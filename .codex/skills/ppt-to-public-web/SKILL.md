---
name: ppt-to-public-web
description: Convert a PowerPoint deck into a static public website and publish it through Lark/Miaoda HTML hosting. Use when the user asks to turn a PPT/PPTX into a web page, public website, external-access link, shareable HTML site, or hosted presentation page, especially when slide order, image placement, and source-deck logic must be preserved.
---

# PPT To Public Web

## Goal

Turn a `.pptx` into a static website that can be opened from other computers. Prefer faithful slide-order conversion unless the user explicitly asks for a rewritten landing page.

## Decide Fidelity First

Before building, lock one fidelity mode:

- **Strict slide-order website**: one web section per slide, preserving slide order, section numbering, and image ownership. Use this by default for reports, reviews, internal/external presentations, and any time the user says "按 PPT 逻辑", "严格按照", or objects to rearranged content.
- **Rendered slide images**: render each slide as an image when visual fidelity matters more than selectable text or mobile readability.
- **Rewritten landing page**: only use when the user explicitly wants marketing/storytelling transformation. Do not assume this from "生成网站".

If the user wants an externally accessible website, local file paths are not enough. Publish to a hosting target and return the hosted URL.

## Source Extraction

1. Confirm the PPTX path exists.
2. Extract every slide's text in slide-number order.
3. Inspect picture count per slide and map each media asset to its original slide before using images.
4. Preserve repeated deck headers and slide numbers if they communicate structure.

Useful extraction approach:

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING='utf-8'
$py='C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
```

Use Python `zipfile` + OOXML XML parsing for text and picture counts. Extract `ppt/media/image*` into the site `assets/` directory, but only place each image in the section corresponding to its original slide.

## Build Rules

- Create a clean static site directory with `index.html` and `assets/`.
- For strict mode, create one main `<section>` per slide, with stable IDs such as `slide-1`, `slide-2`, etc.
- Do not move screenshots to the hero, footer, or decorative areas unless they appear on that slide in the PPT.
- Do not invent new business conclusions, rename the report logic, or collapse numbered sections unless the user approved that fidelity mode.
- Use responsive CSS so the site reads on desktop and mobile, but keep the content sequence identical to the PPT.
- Add a small inline favicon to avoid a noisy `favicon.ico` 404 during validation.
- Keep the publish directory clean: no `.env`, `.npmrc`, `node_modules`, source caches, or temporary contact sheets.

## Validation Checklist

Run these checks before publishing:

- Main section count equals slide count.
- Section IDs are ordered from `slide-1` to `slide-N`.
- Image references exist and every image appears only in its original slide section.
- Desktop and mobile widths have `document.documentElement.scrollWidth - document.documentElement.clientWidth === 0`.
- `brokenImages` is empty.
- Browser console has no errors.
- Manually inspect any slides that contain images, especially when the user complained about image logic.

Playwright CLI can validate quickly:

```powershell
D:\nodejs24\npx.cmd --package @playwright/cli playwright-cli open http://127.0.0.1:<port>/
D:\nodejs24\npx.cmd --package @playwright/cli playwright-cli eval "({sections:[...document.querySelectorAll('section.slide')].map(s=>s.id),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,brokenImages:[...document.images].filter(img=>!img.complete||img.naturalWidth===0).map(img=>img.getAttribute('src'))})"
D:\nodejs24\npx.cmd --package @playwright/cli playwright-cli console
```

## Publish With Miaoda HTML Hosting

Use the `lark-apps` skill for command details and auth handling.

Key rules:

- If no existing `app_id` is supplied, create an HTML app with `lark-cli apps +create --as user --app-type html`.
- If reworking a prior site, reuse the existing `app_id` instead of creating a new app.
- `lark-cli apps +html-publish` requires `--path` to be relative to the current directory. `cd` to the parent directory and pass a relative path such as `.\site-dir`.
- The final public link is the `data.url` returned by `+html-publish`, not the Miaoda editor URL.
- For external access, set public scope after publish if needed:

```powershell
lark-cli apps +html-publish --as user --app-id <app_id> --path ".\<site-dir>" --jq ".data.url"
lark-cli apps +access-scope-set --as user --app-id <app_id> --scope public --require-login=false --json
```

If `spark:app:write` is missing, follow the `lark-shared` split auth flow:

1. Run `lark-cli auth login --scope "spark:app:write" --no-wait --json`.
2. Generate and show a QR code with `lark-cli auth qrcode <verification_url> --output <relative-path>`.
3. After the user confirms authorization, run `lark-cli auth login --device-code <device_code>`.
4. Continue publish.

## Final Response

Return:

- The hosted public URL.
- Whether public no-login access was set.
- The local `index.html` path.
- A concise validation summary, including slide count, image placement check, and browser checks.
