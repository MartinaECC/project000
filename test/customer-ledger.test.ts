import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendLedgerRowToDocumentXml,
  buildLedgerRowXml,
  extractCustomerNameFromTitle,
  matchCustomerWikiNode,
  parseCustomerLedgerInput
} from '../src/customer-ledger.ts';

test('parses customer ledger input with relative date and time', () => {
  const parsed = parseCustomerLedgerInput(
    '\u4eac\u4e1c\u91d1\u878d \u4eca\u592915:30 \u540c\u6b651503\u6d41\u91cf\u5207\u56de39.9\u5143',
    new Date('2026-06-26T02:00:00.000Z')
  );

  assert.equal(parsed?.customerName, '\u4eac\u4e1c\u91d1\u878d');
  assert.equal(parsed?.ledgerDate, '260626');
  assert.equal(parsed?.occurredAt, '2026-06-26T07:30:00.000Z');
  assert.equal(parsed?.action, '\u540c\u6b651503\u6d41\u91cf\u5207\u56de39.9\u5143');
});

test('parses customer ledger input after a leading bot mention', () => {
  const parsed = parseCustomerLedgerInput(
    '@\u5c0f\u7070\u9f99 \u5c0f\u8d62\u79d1\u6280 \u660e\u5929 09:05 \u8865\u5145\u5bf9\u8d26\u7ed3\u8bba',
    new Date('2026-06-26T02:00:00.000Z')
  );

  assert.equal(parsed?.customerName, '\u5c0f\u8d62\u79d1\u6280');
  assert.equal(parsed?.ledgerDate, '260627');
  assert.equal(parsed?.occurredAt, '2026-06-27T01:05:00.000Z');
  assert.equal(parsed?.action, '\u8865\u5145\u5bf9\u8d26\u7ed3\u8bba');
});

test('parses customer ledger input with a leading ledger command prefix', () => {
  const parsed = parseCustomerLedgerInput(
    '\u767b\u8bb0\u53f0\u8d26\uff1a\u6211\u6765\u6570\u79d1 6.24 \u6d4b\u8bd5\u53f0\u8d26',
    new Date('2026-06-26T02:00:00.000Z')
  );

  assert.equal(parsed?.customerName, '\u6211\u6765\u6570\u79d1');
  assert.equal(parsed?.ledgerDate, '260624');
  assert.equal(parsed?.action, '\u6d4b\u8bd5\u53f0\u8d26');
});

test('parses team ledger command with day-only Chinese date', () => {
  const parsed = parseCustomerLedgerInput(
    '@\u5c0f\u7070\u9f99-\u8fd0\u8425\u52a9\u624b \u8bb0\u53f0\u8d26\uff1a \u4eac\u4e1c\u91d1\u878d 26\u65e5 \u8ba2\u5355\u53ef\u83b7\u53d6\u5230\u624b\u673a\u53f7\u5417',
    new Date('2026-06-26T02:00:00.000Z')
  );

  assert.equal(parsed?.customerName, '\u4eac\u4e1c\u91d1\u878d');
  assert.equal(parsed?.ledgerDate, '260626');
  assert.equal(parsed?.occurredAt, '2026-06-25T16:00:00.000Z');
  assert.equal(parsed?.action, '\u8ba2\u5355\u53ef\u83b7\u53d6\u5230\u624b\u673a\u53f7\u5417');
});

test('parses ledger command prefixed with assistant name', () => {
  const parsed = parseCustomerLedgerInput(
    '\u5c0f\u7070\u9f99\uff0c\u8bb0\u53f0\u8d26\uff1a \u5947\u5bcc\u6570\u79d1 6\u670826\u65e5 \u5df2\u540c\u6b65\u65b9\u6848',
    new Date('2026-06-26T02:00:00.000Z')
  );

  assert.equal(parsed?.customerName, '\u5947\u5bcc\u6570\u79d1');
  assert.equal(parsed?.ledgerDate, '260626');
  assert.equal(parsed?.action, '\u5df2\u540c\u6b65\u65b9\u6848');
});

test('does not parse incomplete customer ledger input', () => {
  assert.equal(parseCustomerLedgerInput('\u4eac\u4e1c\u91d1\u878d \u4eca\u592915:30'), undefined);
  assert.equal(parseCustomerLedgerInput('\u4eca\u592915:30 \u540c\u6b65\u8fdb\u5ea6'), undefined);
});

test('extracts and matches customer names from ledger document titles', () => {
  const nodes = [
    {
      nodeToken: 'node-1',
      objToken: 'doc-1',
      objType: 'docx',
      title: '001 \u4eac\u4e1c\u91d1\u878d\uff5c\u9879\u76ee\u53f0\u8d26'
    },
    {
      nodeToken: 'node-2',
      objToken: 'doc-2',
      objType: 'docx',
      title: '010 \u5c0f\u8d62\u79d1\u6280\uff5c\u8fd0\u8425\u53f0\u8d26'
    },
    {
      nodeToken: 'template',
      objToken: 'doc-template',
      objType: 'docx',
      title: '\u6a21\u677f | \u5408\u4f5c\u53f0\u8d26'
    }
  ];

  assert.equal(extractCustomerNameFromTitle(nodes[0].title), '\u4eac\u4e1c\u91d1\u878d');
  const match = matchCustomerWikiNode('\u5c0f\u8d62\u79d1\u6280', nodes);
  assert.equal(match.status, 'matched');
  assert.equal(match.status === 'matched' ? match.node.objToken : '', 'doc-2');
});

test('reports multiple customer document candidates', () => {
  const nodes = [
    { nodeToken: 'a', objToken: 'doc-a', objType: 'docx', title: '010 \u5c0f\u8d62\u79d1\u6280\uff5c\u8fd0\u8425\u53f0\u8d26' },
    { nodeToken: 'b', objToken: 'doc-b', objType: 'docx', title: '011 \u5c0f\u8d62\u91d1\u878d\uff5c\u8fd0\u8425\u53f0\u8d26' }
  ];

  const match = matchCustomerWikiNode('\u5c0f\u8d62', nodes);

  assert.equal(match.status, 'multiple');
  assert.equal(match.status === 'multiple' ? match.candidates.length : 0, 2);
});

test('builds and appends a ledger table row as XML', () => {
  assert.equal(
    buildLedgerRowXml('260626', '\u8c03\u6574 A&B <39.9>'),
    '<tr><td><p>260626</p></td><td><p>\u8c03\u6574 A&amp;B &lt;39.9&gt;</p></td><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>'
  );

  const original =
    '<title>demo</title><h4>\u4eac\u4e1c\u8fd0\u8425\u53f0\u8d26</h4><table id="tbl1"><thead><tr><th><p>\u65e5\u671f</p></th><th><p>\u5185\u5bb9</p></th><th><p>\u884c\u52a8</p></th><th><p>\u590d\u76d8</p></th><th><p>\u4e0b\u4e00\u6b65</p></th></tr></thead><tbody><tr><td><p>260625</p></td><td><p>old</p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr></tbody></table>';
  const updated = appendLedgerRowToDocumentXml(original, '260626', '\u65b0\u589e\u8bb0\u5f55');

  assert.match(updated, /<td><p>260626<\/p><\/td><td><p>\u65b0\u589e\u8bb0\u5f55<\/p><\/td>/u);
  assert.match(updated, /<td><p>old<\/p><\/td>/u);
});

test('builds ledger table row with image urls in content cell', () => {
  assert.equal(
    buildLedgerRowXml('260626', '\u8865\u5145\u56fe\u7247', ['https://example.test/a.png?x=1&y=2']),
    '<tr><td><p>260626</p></td><td><p>\u8865\u5145\u56fe\u7247</p><img href="https://example.test/a.png?x=1&amp;y=2"/></td><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>'
  );
});

test('appends a ledger row to legacy operation table headers', () => {
  const original =
    '<h4>\u6211\u6765\u6570\u79d1\u8fd0\u8425\u53f0\u8d26</h4><table id="legacy"><thead><tr><th><p>\u65e5\u671f</p></th><th><p>\u95ee\u9898\u548c\u5185\u5bb9</p></th><th><p>\u65b9\u6848</p></th><th><p>\u6570\u636e\u60c5\u51b5</p></th><th><p>\u4e0b\u4e00\u6b65\u884c\u52a8</p></th><th><p>\u6587\u6863</p></th></tr></thead><tbody><tr><td><p>11.12</p></td><td><p>old</p></td><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr></tbody></table>';
  const updated = appendLedgerRowToDocumentXml(original, '260624', '\u6d4b\u8bd5\u53f0\u8d26');

  assert.match(updated, /<td><p>260624<\/p><\/td><td><p>\u6d4b\u8bd5\u53f0\u8d26<\/p><\/td>/u);
  assert.match(updated, /<td><p>11\.12<\/p><\/td>/u);
});
