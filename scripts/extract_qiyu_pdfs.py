from pathlib import Path
import json
import re

import pdfplumber


SOURCE_DIR = Path(r"C:\Users\Administrator\Desktop\七鱼大模型机器人产品手册")
OUT_DIR = Path("tmp/qiyu_pdf_text")


def clean_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    records = []

    for pdf_path in sorted(SOURCE_DIR.glob("*.pdf")):
        pages = []
        with pdfplumber.open(pdf_path) as pdf:
            for idx, page in enumerate(pdf.pages, start=1):
                text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
                text = clean_text(text)
                if text:
                    pages.append(f"## Page {idx}\n{text}")

            page_count = len(pdf.pages)

        extracted = "\n\n".join(pages)
        out_path = OUT_DIR / f"{pdf_path.stem}.txt"
        out_path.write_text(extracted, encoding="utf-8")
        records.append(
            {
                "file": pdf_path.name,
                "pages": page_count,
                "chars": len(extracted),
                "output": str(out_path),
            }
        )

    (OUT_DIR / "manifest.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(json.dumps(records, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
