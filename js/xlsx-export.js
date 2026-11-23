/* ------------------------------------------------------------------
   Minimal zero-dependency OOXML (.xlsx) workbook generator.
   Produces standards-compliant ZIP (STORE) + SpreadsheetML workbooks
   with UTF-8 Chinese support, styled header/title/summary rows, live
   numeric formulas, and CJK-aware column widths.
   ------------------------------------------------------------------ */
((root) => {
  'use strict';

  const encoder = new TextEncoder();

  // Standard IEEE 802.3 CRC-32 lookup table
  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function escapeXml(value) {
    return String(value ?? '')
      // Strip illegal XML 1.0 control characters (keep tab, LF, CR)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function colLetter(index) {
    let n = index + 1;
    let out = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      out = String.fromCharCode(65 + rem) + out;
      n = Math.floor((n - 1) / 26);
    }
    return out;
  }

  function sanitizeSheetName(name, used) {
    let clean = String(name || 'Sheet')
      .replace(/[:\\/?*[\]]/g, '-')
      .replace(/^'+|'+$/g, '')
      .trim() || 'Sheet';
    if (clean.length > 31) clean = clean.slice(0, 31);
    let candidate = clean;
    let suffix = 2;
    while (used.has(candidate.toLowerCase())) {
      const tail = `_${suffix++}`;
      candidate = clean.slice(0, Math.max(1, 31 - tail.length)) + tail;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  }

  function visualWidth(text) {
    let width = 0;
    for (const ch of String(text ?? '')) {
      const code = ch.codePointAt(0);
      // CJK unified ideographs, fullwidth forms, punctuation
      if (
        (code >= 0x1100 && code <= 0x115f) ||
        (code >= 0x2e80 && code <= 0xa4cf) ||
        (code >= 0xac00 && code <= 0xd7a3) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xfe10 && code <= 0xfe6f) ||
        (code >= 0xff00 && code <= 0xff60) ||
        (code >= 0xffe0 && code <= 0xffe6)
      ) {
        width += 2.15;
      } else {
        width += 1.1;
      }
    }
    return width;
  }

  function dosTimestamp(date) {
    const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    const year = Math.max(1980, d.getFullYear());
    const dosTime = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() >> 1) & 0x1f);
    const dosDate = (((year - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f);
    return { dosTime, dosDate };
  }

  function buildZip(entries, now = new Date()) {
    const { dosTime, dosDate } = dosTimestamp(now);
    const locals = [];
    const centrals = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBytes = encoder.encode(entry.name);
      const dataBytes = entry.data instanceof Uint8Array ? entry.data : encoder.encode(entry.data);
      const sum = crc32(dataBytes);
      const size = dataBytes.length;

      // Local file header (30 bytes + filename)
      const local = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);          // version needed: 2.0
      lv.setUint16(6, 0x0800, true);      // UTF-8 filename flag
      lv.setUint16(8, 0, true);           // compression: STORE (0)
      lv.setUint16(10, dosTime, true);
      lv.setUint16(12, dosDate, true);
      lv.setUint32(14, sum, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      local.set(nameBytes, 30);

      // Central directory header (46 bytes + filename)
      const central = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);          // version made by
      cv.setUint16(6, 20, true);          // version needed
      cv.setUint16(8, 0x0800, true);      // UTF-8 filename flag
      cv.setUint16(10, 0, true);          // compression: STORE
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, sum, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      central.set(nameBytes, 46);

      locals.push(local, dataBytes);
      centrals.push(central);
      offset += local.length + dataBytes.length;
    }

    const centralSize = centrals.reduce((acc, part) => acc + part.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const total = offset + centralSize + eocd.length;
    const output = new Uint8Array(total);
    let cursor = 0;
    for (const chunk of [...locals, ...centrals, eocd]) {
      output.set(chunk, cursor);
      cursor += chunk.length;
    }
    return output;
  }

  /* Style indices in xl/styles.xml:
     0: default normal
     1: title banner (bold 13pt, warm light tint, centered)
     2: table header (bold 11pt, warm alabaster header fill, thin border, centered)
     3: body text left (10.5pt, thin border, left aligned)
     4: body text center (10.5pt, thin border, centered)
     5: body number right (10.5pt, thin border, right aligned)
     6: summary text (bold 10.5pt, soft fill, thin border, left)
     7: summary number (bold 10.5pt, soft fill, thin border, right)
  */
  function buildStylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><color rgb="FF141413"/><name val="Microsoft YaHei"/></font>
    <font><b/><sz val="13"/><color rgb="FF141413"/><name val="Microsoft YaHei"/></font>
    <font><b/><sz val="11"/><color rgb="FF141413"/><name val="Microsoft YaHei"/></font>
    <font><b/><sz val="11"/><color rgb="FF3D3D3A"/><name val="Microsoft YaHei"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF0EEE6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8E5DA"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF7F5EE"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD2D0C6"/></left>
      <right style="thin"><color rgb="FFD2D0C6"/></right>
      <top style="thin"><color rgb="FFD2D0C6"/></top>
      <bottom style="thin"><color rgb="FFD2D0C6"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="8">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
  }

  function renderCell(ref, cell, fallbackStyle) {
    const isObj = cell !== null && typeof cell === 'object' && !Array.isArray(cell);
    const style = isObj && Number.isInteger(cell.style) ? cell.style : fallbackStyle;
    const value = isObj ? cell.value : cell;
    const formula = isObj ? cell.formula : null;

    if (formula) {
      const cached = typeof value === 'number' && Number.isFinite(value) ? `<v>${value}</v>` : '';
      return `<c r="${ref}" s="${style}"><f>${escapeXml(formula)}</f>${cached}</c>`;
    }
    if (value === null || value === undefined || value === '') {
      return `<c r="${ref}" s="${style}"/>`;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
    }
    const text = String(value);
    const preserve = /^\s|\s$|\n/.test(text) ? ' xml:space="preserve"' : '';
    return `<c r="${ref}" t="inlineStr" s="${style}"><is><t${preserve}>${escapeXml(text)}</t></is></c>`;
  }

  function buildWorksheetXml(sheet) {
    const columns = sheet.columns || [];
    const colCount = Math.max(
      columns.length,
      ...(sheet.rows || []).map((row) => (Array.isArray(row) ? row.length : (row.cells || []).length)),
      1
    );
    const widths = new Array(colCount).fill(10);
    for (let c = 0; c < colCount; c++) {
      const col = columns[c];
      if (col && typeof col.minWidth === 'number') widths[c] = Math.max(widths[c], col.minWidth);
      if (col && col.header) widths[c] = Math.max(widths[c], visualWidth(col.header) + 4);
    }

    const rowXml = [];
    const merges = [];
    let rowNum = 1;

    if (sheet.title) {
      const cells = [];
      for (let c = 0; c < colCount; c++) {
        cells.push(renderCell(`${colLetter(c)}${rowNum}`, c === 0 ? sheet.title : '', 1));
      }
      rowXml.push(`<row r="${rowNum}" ht="30" customHeight="1">${cells.join('')}</row>`);
      if (colCount > 1) merges.push(`A${rowNum}:${colLetter(colCount - 1)}${rowNum}`);
      rowNum++;
    }

    if (columns.length) {
      const cells = columns.map((col, c) => renderCell(`${colLetter(c)}${rowNum}`, col.header ?? '', 2));
      rowXml.push(`<row r="${rowNum}" ht="24" customHeight="1">${cells.join('')}</row>`);
      rowNum++;
    }

    const freezeRow = sheet.freezeHeader !== false ? rowNum - 1 : 0;

    for (const rawRow of sheet.rows || []) {
      const isObj = rawRow && !Array.isArray(rawRow);
      const cellsData = isObj ? (rawRow.cells || []) : rawRow;
      const height = isObj && rawRow.height ? rawRow.height : 22;
      const isSummary = Boolean(isObj && rawRow.summary);
      const cells = [];

      for (let c = 0; c < colCount; c++) {
        const entry = cellsData[c];
        const col = columns[c] || {};
        let style = 3;
        if (isSummary) {
          style = col.align === 'right' ? 7 : 6;
        } else if (col.align === 'center') {
          style = 4;
        } else if (col.align === 'right') {
          style = 5;
        }
        const val = entry !== null && typeof entry === 'object' ? entry.value : entry;
        if (val !== null && val !== undefined && val !== '') {
          const w = visualWidth(val) + 4;
          const cap = col.maxWidth || 44;
          widths[c] = Math.min(cap, Math.max(widths[c], w));
        }
        cells.push(renderCell(`${colLetter(c)}${rowNum}`, entry, style));
      }

      rowXml.push(`<row r="${rowNum}" ht="${height}" customHeight="1">${cells.join('')}</row>`);
      rowNum++;
    }

    const colsXml = widths
      .map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${w.toFixed(2)}" customWidth="1"/>`)
      .join('');
    const sheetViews = freezeRow > 0
      ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRow}" topLeftCell="A${freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
      : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    const mergeXml = merges.length
      ? `<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`
      : '';
    const lastCell = `${colLetter(colCount - 1)}${Math.max(1, rowNum - 1)}`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCell}"/>
  ${sheetViews}
  <sheetFormatPr defaultRowHeight="21"/>
  <cols>${colsXml}</cols>
  <sheetData>${rowXml.join('')}</sheetData>
  ${mergeXml}
</worksheet>`;
  }

  function buildXlsx(sheets, options = {}) {
    if (!Array.isArray(sheets) || !sheets.length) {
      throw new Error('At least one worksheet is required.');
    }
    const usedNames = new Set();
    const prepared = sheets.map((sheet, index) => ({
      ...sheet,
      safeName: sanitizeSheetName(sheet.name || `Sheet${index + 1}`, usedNames),
      id: index + 1
    }));

    const sheetOverrides = prepared
      .map((s) => `<Override PartName="/xl/worksheets/sheet${s.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
      .join('');
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`;

    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const workbookSheets = prepared
      .map((s) => `<sheet name="${escapeXml(s.safeName)}" sheetId="${s.id}" r:id="rId${s.id}"/>`)
      .join('');
    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${workbookSheets}</sheets>
</workbook>`;

    const wbRelsList = prepared
      .map((s) => `<Relationship Id="rId${s.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.id}.xml"/>`)
      .join('');
    const styleRelId = `rId${prepared.length + 1}`;
    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${wbRelsList}
  <Relationship Id="${styleRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const entries = [
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rootRels },
      { name: 'xl/workbook.xml', data: workbook },
      { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
      { name: 'xl/styles.xml', data: buildStylesXml() },
      ...prepared.map((s) => ({
        name: `xl/worksheets/sheet${s.id}.xml`,
        data: buildWorksheetXml(s)
      }))
    ];

    return buildZip(entries, options.now);
  }

  function downloadXlsx(filename, sheets, options = {}) {
    const bytes = buildXlsx(sheets, options);
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return bytes;
  }

  root.siteXlsx = { buildXlsx, downloadXlsx, sanitizeSheetName, colLetter, crc32 };
})(typeof globalThis !== 'undefined' ? globalThis : window);
