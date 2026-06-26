import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "E:/Workspace_codex/project000/outputs/image_to_excel_20260624";

function excelDateTime(year, month, day, hour, minute, second) {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const timestamp = Date.UTC(year, month - 1, day, hour, minute, second);
  return (timestamp - excelEpoch) / 86400000;
}

const rows = [
  ["13065907293", excelDateTime(2026, 6, 23, 14, 28, 8), "啥子意思"],
  ["13347115073", excelDateTime(2026, 6, 23, 13, 13, 25), "告诉我咋举报你了"],
  ["15870131868", excelDateTime(2026, 6, 23, 11, 53, 49), "我要取消"],
  ["18905274405", excelDateTime(2026, 6, 23, 11, 1, 30), "你好，取消会员可以吗"],
  ["15399952226", excelDateTime(2026, 6, 23, 10, 44, 7), "你们是什么意思"],
  ["15399952226", excelDateTime(2026, 6, 23, 10, 43, 58), "打你电话又没人接"],
  ["15399952226", excelDateTime(2026, 6, 23, 10, 43, 20), "你们是什么东东，干嘛要扣我的钱"],
  ["13537923139", excelDateTime(2026, 6, 23, 10, 37, 17), "申请注销"],
  ["18670389070", excelDateTime(2026, 6, 23, 10, 36, 50), "取消"],
  ["18137638191", excelDateTime(2026, 6, 23, 10, 36, 48), "退款"],
  ["13537923139", excelDateTime(2026, 6, 23, 10, 36, 46), "这是什么情况?"],
  ["13757621945", excelDateTime(2026, 6, 23, 10, 33, 35), "退订，退订"],
  ["18291626846", excelDateTime(2026, 6, 23, 9, 50, 48), "扣你妈的通呀！你们成天天天就扣老子钱，日你个妈"],
  ["13974780582", excelDateTime(2026, 6, 23, 9, 46, 19), "这是什么东西，我要取消"],
  ["13798339903", excelDateTime(2026, 6, 23, 9, 37, 20), "你好"],
  ["13915010060", excelDateTime(2026, 6, 23, 8, 17, 43), "这是什么钱"],
];

await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("截图转录");
sheet.showGridLines = false;

sheet.getRange("A1:C1").values = [["手机号", "时间", "留言"]];
sheet.getRange(`A2:C${rows.length + 1}`).values = rows;

sheet.getRange("A1:C1").format = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange(`A1:C${rows.length + 1}`).format.borders = {
  preset: "all",
  style: "thin",
  color: "#D9E2EC",
};
sheet.getRange(`A2:A${rows.length + 1}`).format = {
  numberFormat: "@",
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange(`B2:B${rows.length + 1}`).format = {
  numberFormat: "yyyy-mm-dd hh:mm:ss",
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange(`C2:C${rows.length + 1}`).format = {
  wrapText: true,
  horizontalAlignment: "left",
  verticalAlignment: "center",
};

sheet.getRange("A:A").format.columnWidth = 16;
sheet.getRange("B:B").format.columnWidth = 22;
sheet.getRange("C:C").format.columnWidth = 38;
sheet.getRange("1:1").format.rowHeight = 26;
sheet.getRange(`2:${rows.length + 1}`).format.rowHeight = 32;

const table = sheet.tables.add(`A1:C${rows.length + 1}`, true, "ScreenshotMessages");
table.style = "TableStyleMedium2";
table.showFilterButton = true;

sheet.freezePanes.freezeRows(1);

const preview = await workbook.render({
  sheetName: "截图转录",
  autoCrop: "all",
  scale: 1,
  format: "png",
});
await fs.writeFile(`${outputDir}/preview.png`, new Uint8Array(await preview.arrayBuffer()));

const tableCheck = await workbook.inspect({
  kind: "table",
  range: `截图转录!A1:C${rows.length + 1}`,
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 3,
  maxChars: 6000,
});
console.log(tableCheck.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/图片转录留言记录.xlsx`);
console.log(`${outputDir}/图片转录留言记录.xlsx`);
