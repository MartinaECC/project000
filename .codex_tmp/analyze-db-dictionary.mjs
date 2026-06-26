import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/Administrator/Desktop/jianyun生产数据库字典.xlsx";
const outDir = path.resolve(".codex_tmp/outputs");
await fs.mkdir(outDir, { recursive: true });

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

function rowsToObjects(values) {
  const [headers, ...rows] = values;
  return rows
    .filter((row) => row.some((cell) => cell !== null && cell !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])));
}

function parseCount(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const tableSheet = workbook.worksheets.getItem("表");
const columnSheet = workbook.worksheets.getItem("表结构");
const codeSheet = workbook.worksheets.getItem("数据字典（码表）");

const tables = rowsToObjects(tableSheet.getRange("A1:F287").values);
const columns = rowsToObjects(columnSheet.getRange("A1:O4404").values);
const codes = rowsToObjects(codeSheet.getRange("A1:D231").values);

const byTopic = new Map();
for (const row of tables) {
  const key = `${row["主题一"] || ""} / ${row["主题二"] || ""}`;
  if (!byTopic.has(key)) byTopic.set(key, { topic: key, tables: 0, rows: 0 });
  const item = byTopic.get(key);
  item.tables += 1;
  item.rows += parseCount(row["数据量"]);
}

const columnsByTable = new Map();
const pkByTable = new Map();
const nullableByTable = new Map();
for (const row of columns) {
  const table = row["表英文名"];
  columnsByTable.set(table, (columnsByTable.get(table) || 0) + 1);
  if (row.KEY === "PRI") pkByTable.set(table, (pkByTable.get(table) || 0) + 1);
  if (row["是否为空"] === "YES") nullableByTable.set(table, (nullableByTable.get(table) || 0) + 1);
}

const tableDetails = tables.map((row) => ({
  db: row["库名"],
  topic1: row["主题一"],
  topic2: row["主题二"],
  table: row["表英文名"],
  name: row["表中文名"],
  rows: parseCount(row["数据量"]),
  columns: columnsByTable.get(row["表英文名"]) || 0,
  primaryKeys: pkByTable.get(row["表英文名"]) || 0,
  nullableColumns: nullableByTable.get(row["表英文名"]) || 0,
}));

const data = {
  workbook: {
    path: inputPath,
    sheets: [
      { name: "表", range: "A1:F287", rows: tables.length, description: "表清单，含主题、英文表名、中文表名、数据量" },
      { name: "表结构", range: "A1:O4404", rows: columns.length, description: "字段级结构，含列名、类型、顺序、是否为空、KEY、默认值等" },
      { name: "数据字典（码表）", range: "A1:D231", rows: codes.length, description: "枚举/码表，含字典名称、类型和值说明" },
    ],
  },
  totals: {
    databases: [...new Set(tables.map((row) => row["库名"]))],
    tables: tables.length,
    columns: columns.length,
    codeDictionaries: codes.length,
    totalRecordedRows: tableDetails.reduce((sum, row) => sum + row.rows, 0),
  },
  topics: [...byTopic.values()].sort((a, b) => b.tables - a.tables || b.rows - a.rows),
  largestTables: [...tableDetails].sort((a, b) => b.rows - a.rows).slice(0, 25),
  widestTables: [...tableDetails].sort((a, b) => b.columns - a.columns).slice(0, 25),
  tableDetails,
  sampleCodeDictionaries: codes.slice(0, 30),
};

await fs.writeFile(path.join(outDir, "db-dictionary-analysis.json"), JSON.stringify(data, null, 2), "utf8");

console.log(JSON.stringify({
  totals: data.totals,
  topics: data.topics.slice(0, 20),
  largestTables: data.largestTables.slice(0, 15),
  widestTables: data.widestTables.slice(0, 15),
  sampleCodeDictionaries: data.sampleCodeDictionaries.slice(0, 10),
}, null, 2));
