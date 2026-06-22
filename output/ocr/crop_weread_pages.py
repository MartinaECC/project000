from pathlib import Path
from PIL import Image, ImageOps, ImageFilter

GROUPS = [
    (Path(r"E:\Workspace_codex\project000\output\weread_pages"), 0),
    (Path(r"E:\Workspace_codex\project000\output\weread_pages_part2"), 20),
]
OUT_DIR = Path(r"E:\Workspace_codex\project000\output\weread_ocr")


def iter_pages():
    for folder, offset in GROUPS:
        if not folder.exists():
            continue
        for file in sorted(folder.glob("page_*.png")):
            index = int(file.stem.split("_")[1]) + offset
            yield index, file


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for index, source in iter_pages():
        image = Image.open(source).convert("RGB")
        w, h = image.size
        box = (
            round(w * 0.11),
            round(h * 0.18),
            round(w * 0.90),
            round(h * 0.94),
        )
        cropped = image.crop(box)
        cropped = ImageOps.grayscale(cropped)
        cropped = ImageOps.autocontrast(cropped)
        cropped = cropped.filter(ImageFilter.SHARPEN)
        target = OUT_DIR / f"crop_{index:03d}.png"
        cropped.save(target)
        print(target)


if __name__ == "__main__":
    main()
