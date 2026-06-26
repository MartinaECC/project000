import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/Administrator/Desktop/jianyun生产数据库字典.xlsx";
const outDir = path.resolve(".codex_tmp/outputs");
await fs.mkdir(outDir, { recursive: true });

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

async function saveInspect(name, options) {
  const result = await workbook.inspect(options);
  const outputPath = path.join(outDir, `${name}.ndjson`);
  await fs.writeFile(outputPath, result.ndjson, "utf8");
  console.log(`WROTE ${outputPath}`);
  console.log(result.ndjson.slice(0, 4000));
}

await saveInspect("summary", {
  kind: "workbook,sheet,table",
  maxChars: 20000,
  tableMaxRows: 10,
  tableMaxCols: 12,
  tableMaxCellChars: 120,
});

await saveInspect("sheets", {
  kind: "sheet",
  include: "id,name",
  maxChars: 20000,
});

const sheetsText = await fs.readFile(path.join(outDir, "sheets.ndjson"), "utf8");
const sheetNames = [];
for (const line of sheetsText.split(/\r?\n/)) {
  if (!line.trim()) continue;
  try {
    const row = JSON.parse(line);
    if (row.name) sheetNames.push(row.name);
  } catch {}
}

for (const sheetName of sheetNames) {
  const safe = sheetName.replace(/[\\/:*?"<>|]/g, "_");
  await saveInspect(`region-${safe}`, {
    kind: "region",
    sheetId: sheetName,
    range: "A1:Z20",
    maxChars: 20000,
    tableMaxRows: 20,
    tableMaxCols: 26,
    tableMaxCellChars: 160,
  });
}
