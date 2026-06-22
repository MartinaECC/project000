const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

const outDir = 'E:/Workspace_codex/project000/output/weread_ocr';

function pageFiles() {
  return fs.readdirSync(outDir)
    .filter((name) => /^crop_\d+\.png$/.test(name))
    .sort()
    .map((file) => ({
      source: path.join(outDir, file),
      index: Number(file.match(/crop_(\d+)\.png/)[1]),
    }));
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const files = pageFiles();
  const worker = await createWorker('chi_sim');
  const all = [];
  for (const item of files) {
    const txtPath = path.join(outDir, `page_${String(item.index).padStart(3, '0')}.txt`);
    const { data } = await worker.recognize(item.source);
    const text = (data.text || '').replace(/\r/g, '').trim();
    fs.writeFileSync(txtPath, text, 'utf8');
    all.push(`\n\n===== PAGE ${String(item.index).padStart(3, '0')} =====\n${text}`);
    console.log(`OCR ${item.index}/${files.length}: ${text.length} chars`);
  }
  await worker.terminate();
  fs.writeFileSync(path.join(outDir, 'all_pages.txt'), all.join(''), 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
