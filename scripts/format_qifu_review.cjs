const fs = require('node:fs');

const path = 'qifu_202605_review.xml';
let xml = fs.readFileSync(path, 'utf8');

xml = xml.replace(
  /<span text-color="(red|green)">([+-])<b>(\d+(?:\.\d+)?(?:%|pct))<\/b><\/span>/g,
  '<span text-color="$1">$2$3</span>',
);
xml = xml.replace(
  /<td(?: background-color="light-red")?>(?:<p>)?(?:<span text-color="red">)?([+]\d+(?:\.\d+)?(?:%|pct))(?:<\/span>)?(?:<\/p>)?<\/td>/g,
  '<td><p><span text-color="red">$1</span></p></td>',
);
xml = xml.replace(
  /<td(?: background-color="light-green")?>(?:<p>)?(?:<span text-color="green">)?([-]\d+(?:\.\d+)?(?:%|pct))(?:<\/span>)?(?:<\/p>)?<\/td>/g,
  '<td><p><span text-color="green">$1</span></p></td>',
);

function boldNumbersInText(text) {
  return text.replace(/(?<![\w>])((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:w|%|pct)?)/g, '<b>$1</b>');
}

function boldNumbersInInlineContent(content) {
  let inBold = false;
  let inSpan = false;

  return content
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (part === '<b>') {
        inBold = true;
        return part;
      }
      if (part === '</b>') {
        inBold = false;
        return part;
      }
      if (part.startsWith('<span ')) {
        inSpan = true;
        return part;
      }
      if (part === '</span>') {
        inSpan = false;
        return part;
      }
      return part.startsWith('<') || inBold || inSpan ? part : boldNumbersInText(part);
    })
    .join('');
}

xml = xml.replace(/<p>([\s\S]*?)<\/p>/g, (_match, content) => `<p>${boldNumbersInInlineContent(content)}</p>`);
xml = xml.replace(/<li>([\s\S]*?)<\/li>/g, (_match, content) => `<li>${boldNumbersInInlineContent(content)}</li>`);

fs.writeFileSync(path, xml, 'utf8');
