import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/Administrator/Desktop/jianyun生产数据库字典.xlsx";
const targets = new Set([
  "product_period_agreement",
  "product_period_agreement_pay",
  "product_period_agreement_pay_notify",
  "pay_sign_order",
  "member_agreement_log",
  "trade_order",
  "trade_order_item",
  "pay_order",
  "pay_refund",
  "trade_after_sale",
  "member_user",
  "cooperation_order_rel",
]);

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("表结构");
const values = sheet.getRange("A1:O4404").values;
const [headers, ...rows] = values;
const tableIndex = headers.indexOf("表英文名");

for (const table of targets) {
  console.log(`\n### ${table}`);
  for (const row of rows.filter((r) => r[tableIndex] === table)) {
    const item = Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]));
    console.log([
      item["列英文名"],
      item["列中文名"],
      item["列类型"],
      `nullable=${item["是否为空"]}`,
      item.KEY ? `key=${item.KEY}` : "",
      item["默认值"] ? `default=${item["默认值"]}` : "",
      item["额外说明"] ? `extra=${item["额外说明"]}` : "",
    ].filter(Boolean).join(" | "));
  }
}
