import {
	cellText,
	objectsToRows,
	type ObjectTableOptions,
	type TableCell,
	type TableObject,
	type TableRow
} from './shared.js';
import { createZip } from './zip.js';

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
	<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
	<Default Extension="xml" ContentType="application/xml"/>
	<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
	<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
	<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
	<numFmts count="2">
		<numFmt numFmtId="164" formatCode="yyyy-mm-dd"/>
		<numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm:ss"/>
	</numFmts>
	<fonts count="2">
		<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
		<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
	</fonts>
	<fills count="2">
		<fill><patternFill patternType="none"/></fill>
		<fill><patternFill patternType="gray125"/></fill>
	</fills>
	<borders count="1">
		<border><left/><right/><top/><bottom/><diagonal/></border>
	</borders>
	<cellStyleXfs count="1">
		<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
	</cellStyleXfs>
	<cellXfs count="6">
		<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
		<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
		<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
		<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
		<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
		<xf numFmtId="165" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
	</cellXfs>
	<cellStyles count="1">
		<cellStyle name="Normal" xfId="0" builtinId="0"/>
	</cellStyles>
	<dxfs count="0"/>
	<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

const STYLE_BOLD = 1;
const STYLE_DATE = 2;
const STYLE_DATETIME = 3;
const STYLE_BOLD_DATE = 4;
const STYLE_BOLD_DATETIME = 5;

const MILLISECONDS_PER_DAY = 86_400_000;
/** Days between the Unix epoch and Excel's 1899-12-30 epoch. */
const EXCEL_EPOCH_OFFSET_DAYS = 25_569;

export interface XlsxWriteOptions {
	/** Worksheet name. Defaults to `Sheet1`. */
	sheetName?: string;
	/** Column widths in characters. Overrides auto-width per column. */
	columnWidths?: readonly (number | undefined)[];
	/** Size columns from their content. Defaults to `true`. */
	autoWidth?: boolean;
	/** Render the first row in bold. Defaults to `false` for raw rows. */
	boldHeaders?: boolean;
}

export interface XlsxOptions<T extends TableObject = TableObject>
	extends ObjectTableOptions<T>, XlsxWriteOptions {}

/** Writes rows to a single-sheet XLSX workbook. */
export async function rowsToXlsxBuffer(
	rows: readonly TableRow[],
	options: XlsxWriteOptions = {}
): Promise<Buffer> {
	return buildXlsx(rows, options);
}

/** Writes objects to a single-sheet XLSX workbook, optionally with a header row. */
export async function objectsToXlsxBuffer<T extends TableObject>(
	objects: readonly T[],
	options: XlsxOptions<T> = {}
): Promise<Buffer> {
	const rows = objectsToRows(objects, {
		includeHeaders: options.includeHeaders,
		headers: options.headers,
		keys: options.keys
	});

	return buildXlsx(rows, {
		sheetName: options.sheetName,
		columnWidths: options.columnWidths,
		autoWidth: options.autoWidth,
		boldHeaders: options.boldHeaders ?? options.includeHeaders ?? false
	});
}

function buildXlsx(rows: readonly TableRow[], options: XlsxWriteOptions): Buffer {
	return createZip([
		{ name: '[Content_Types].xml', data: Buffer.from(CONTENT_TYPES_XML) },
		{ name: '_rels/.rels', data: Buffer.from(ROOT_RELS_XML) },
		{ name: 'xl/workbook.xml', data: Buffer.from(workbookXml(options.sheetName)) },
		{ name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(WORKBOOK_RELS_XML) },
		{ name: 'xl/styles.xml', data: Buffer.from(STYLES_XML) },
		{ name: 'xl/worksheets/sheet1.xml', data: Buffer.from(sheetXml(rows, options)) }
	]);
}

function workbookXml(name: string | undefined): string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
	<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>
	<sheets><sheet name="${escapeXml(sheetName(name))}" sheetId="1" r:id="rId1"/></sheets>
	<calcPr calcId="191029"/>
</workbook>`;
}

function sheetXml(rows: readonly TableRow[], options: XlsxWriteOptions): string {
	const columns = rows.reduce((max, row) => Math.max(max, row.length), 0);
	const dimension =
		columns === 0 || rows.length === 0 ? 'A1' : `A1:${columnName(columns - 1)}${rows.length}`;

	const data = rows
		.map((row, rowIndex) =>
			rowXml(row, rowIndex, (options.boldHeaders ?? false) && rowIndex === 0)
		)
		.join('');

	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
	<dimension ref="${dimension}"/>
	<sheetViews><sheetView workbookViewId="0"/></sheetViews>
	<sheetFormatPr defaultRowHeight="15"/>
	${columnsXml(rows, columns, options)}
	<sheetData>${data}</sheetData>
	<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
}

function rowXml(row: TableRow, rowIndex: number, bold: boolean): string {
	const cells = row
		.map((value, columnIndex) =>
			cellXml(value, `${columnName(columnIndex)}${rowIndex + 1}`, bold)
		)
		.join('');

	return cells ? `<row r="${rowIndex + 1}">${cells}</row>` : `<row r="${rowIndex + 1}"/>`;
}

function cellXml(value: TableCell, reference: string, bold: boolean): string {
	if (value == null || value === '') return '';

	if (value instanceof Date) {
		const serial = dateSerial(value);
		if (serial === null) return stringCell(reference, cellText(value), bold);

		const style = hasTime(value)
			? bold
				? STYLE_BOLD_DATETIME
				: STYLE_DATETIME
			: bold
				? STYLE_BOLD_DATE
				: STYLE_DATE;

		return `<c r="${reference}" s="${style}"><v>${serial}</v></c>`;
	}

	const style = bold ? ` s="${STYLE_BOLD}"` : '';

	if (typeof value === 'boolean') {
		return `<c r="${reference}"${style} t="b"><v>${value ? 1 : 0}</v></c>`;
	}

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return '';
		return `<c r="${reference}"${style}><v>${value}</v></c>`;
	}

	return stringCell(reference, value, bold);
}

function stringCell(reference: string, text: string, bold: boolean): string {
	if (text === '') return '';
	const style = bold ? ` s="${STYLE_BOLD}"` : '';
	return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

function columnsXml(rows: readonly TableRow[], columns: number, options: XlsxWriteOptions): string {
	const parts: string[] = [];

	for (let index = 0; index < columns; index++) {
		const explicit = options.columnWidths?.[index];
		const width =
			explicit ?? ((options.autoWidth ?? true) ? autoWidth(rows, index) : undefined);
		if (width === undefined) continue;

		const clamped = Math.min(255, Math.max(1, width));
		parts.push(
			`<col min="${index + 1}" max="${index + 1}" width="${clamped}" customWidth="1"/>`
		);
	}

	return parts.length > 0 ? `<cols>${parts.join('')}</cols>` : '';
}

function autoWidth(rows: readonly TableRow[], column: number): number {
	let longest = 0;

	for (const row of rows) {
		const value = row[column];
		if (value == null || value === '') continue;

		if (value instanceof Date) {
			longest = Math.max(
				longest,
				Number.isNaN(value.getTime()) ? 0 : hasTime(value) ? 19 : 10
			);
			continue;
		}

		for (const line of cellText(value).split(/\r?\n/)) {
			longest = Math.max(longest, line.length);
		}
	}

	return Math.min(60, Math.max(8, longest + 2));
}

function dateSerial(date: Date): number | null {
	const time = date.getTime();
	if (!Number.isFinite(time)) return null;

	const serial = time / MILLISECONDS_PER_DAY + EXCEL_EPOCH_OFFSET_DAYS;

	// Excel's 1900 leap-year bug shifts dates before 1900-03-01; export those
	// as text instead of writing a number Excel would display incorrectly.
	// The last date Excel accepts is 9999-12-31 (serial 2_958_465).
	if (serial < 61 || serial > 2_958_465) return null;

	return Math.round(serial * MILLISECONDS_PER_DAY) / MILLISECONDS_PER_DAY;
}

function hasTime(date: Date): boolean {
	return (
		date.getUTCHours() !== 0 ||
		date.getUTCMinutes() !== 0 ||
		date.getUTCSeconds() !== 0 ||
		date.getUTCMilliseconds() !== 0
	);
}

function columnName(index: number): string {
	let name = '';
	for (let position = index + 1; position > 0; position = Math.floor((position - 1) / 26)) {
		name = String.fromCharCode(65 + ((position - 1) % 26)) + name;
	}
	return name;
}

function sheetName(value: string | undefined): string {
	const cleaned = (value ?? 'Sheet1')
		.replaceAll(/[[\]:*?/\\]/g, ' ')
		.replaceAll(/^'+|'+$/g, '')
		.trim()
		.slice(0, 31);

	return cleaned || 'Sheet1';
}

function escapeXml(value: string): string {
	let text = '';

	for (const character of value) {
		const code = character.codePointAt(0) ?? 0;
		const isValid =
			code === 0x09 ||
			code === 0x0a ||
			code === 0x0d ||
			(code >= 0x20 && code <= 0xd7ff) ||
			(code >= 0xe000 && code <= 0xfffd) ||
			code >= 0x10000;

		if (isValid) text += character;
	}

	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}
