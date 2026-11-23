import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/xlsx-export.js';

const { buildXlsx, sanitizeSheetName, colLetter, crc32 } = globalThis.siteXlsx;

function parseZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map();
  let offset = 0;

  while (offset + 4 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const flags = view.getUint16(offset + 6, true);
    const method = view.getUint16(offset + 8, true);
    const expectedCrc = view.getUint32(offset + 14, true);
    const compSize = view.getUint32(offset + 18, true);
    const uncompSize = view.getUint32(offset + 22, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    assert.equal(method, 0, 'Expected uncompressed STORE ZIP entry.');
    assert.equal(flags & 0x0800, 0x0800, 'Expected UTF-8 filename bit set.');
    assert.equal(compSize, uncompSize, 'STORE entry sizes must match.');

    const nameStart = offset + 30;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLen));
    const dataStart = nameStart + nameLen + extraLen;
    const data = bytes.subarray(dataStart, dataStart + compSize);
    assert.equal(crc32(data), expectedCrc, `CRC-32 mismatch for ${name}`);

    entries.set(name, decoder.decode(data));
    offset = dataStart + compSize;
  }

  // Locate EOCD signature at end of archive
  const eocdOffset = bytes.length - 22;
  assert.equal(view.getUint32(eocdOffset, true), 0x06054b50, 'Missing ZIP EOCD signature.');
  assert.equal(view.getUint16(eocdOffset + 8, true), entries.size, 'EOCD entry count mismatch.');
  assert.equal(view.getUint16(eocdOffset + 10, true), entries.size, 'EOCD total count mismatch.');
  return entries;
}

test('column letters and sheet names follow OOXML constraints', () => {
  assert.equal(colLetter(0), 'A');
  assert.equal(colLetter(25), 'Z');
  assert.equal(colLetter(26), 'AA');
  const used = new Set();
  assert.equal(sanitizeSheetName('2026/11/23:订购*清单?', used), '2026-11-23-订购-清单-');
  assert.equal(sanitizeSheetName('2026/11/23:订购*清单?', used), '2026-11-23-订购-清单-_2');
  assert.equal(sanitizeSheetName('a'.repeat(40), used).length, 31);
});

test('buildXlsx creates a valid multi-sheet OOXML archive with UTF-8 Chinese, numbers, and formulas', () => {
  const bytes = buildXlsx([
    {
      name: '2026-11-23',
      title: '实验室药品订购单（2026-11-23）',
      columns: [
        { header: '序号', align: 'center', minWidth: 8 },
        { header: '药剂名称', align: 'left', minWidth: 22 },
        { header: '单位', align: 'center', minWidth: 10 },
        { header: '数量', align: 'right', minWidth: 10 },
        { header: '订购人', align: 'center', minWidth: 14 }
      ],
      rows: [
        [1, '无水乙醇 (AR <99.7% & "纯")', '瓶', 4, '张三'],
        [2, '氯化钠', 'g', 500.5, '李四'],
        { summary: true, cells: ['合计', '共 2 项', '', { formula: 'SUM(D3:D4)', value: 504.5 }, ''] }
      ]
    },
    {
      name: '全部汇总',
      title: '实验室药品订购汇总',
      columns: [
        { header: '日期', align: 'center', minWidth: 14 },
        { header: '药剂名称', align: 'left', minWidth: 22 }
      ],
      rows: [['2026-11-23', '无水乙醇']]
    }
  ]);

  const files = parseZip(bytes);
  for (const required of [
    '[Content_Types].xml',
    '_rels/.rels',
    'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels',
    'xl/styles.xml',
    'xl/worksheets/sheet1.xml',
    'xl/worksheets/sheet2.xml'
  ]) {
    assert(files.has(required), `Missing OOXML part: ${required}`);
  }

  const workbook = files.get('xl/workbook.xml');
  assert(workbook.includes('name="2026-11-23"'), 'Sheet 1 name missing.');
  assert(workbook.includes('name="全部汇总"'), 'Chinese Sheet 2 name missing.');

  const sheet1 = files.get('xl/worksheets/sheet1.xml');
  assert(sheet1.includes('实验室药品订购单（2026-11-23）'), 'Title missing.');
  assert(sheet1.includes('无水乙醇 (AR &lt;99.7% &amp; &quot;纯&quot;)'), 'XML entities must be escaped.');
  assert(sheet1.includes('<c r="D3" s="5"><v>4</v></c>'), 'Integer quantity should be stored as numeric cell.');
  assert(sheet1.includes('<c r="D4" s="5"><v>500.5</v></c>'), 'Decimal quantity should be stored as numeric cell.');
  assert(sheet1.includes('<f>SUM(D3:D4)</f><v>504.5</v>'), 'Summary row should include formula and cached value.');
  assert(sheet1.includes('<mergeCell ref="A1:E1"/>'), 'Title row should span all columns.');
  assert(sheet1.includes('ySplit="2"'), 'Header rows should be frozen.');
});
