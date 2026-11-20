import { describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import {
	objectsToCsv,
	objectsToTsv,
	objectsToXlsxBuffer,
	rowsToCsv,
	rowsToTsv,
	rowsToXlsxBuffer
} from '../src/xlsx/index.js';

function sheetXml(buffer: Buffer): string {
	const zip = new PizZip(buffer);
	return zip.file('xl/worksheets/sheet1.xml')?.asText() ?? '';
}

describe('xlsx writer', () => {
	it('writes a valid package with typed cells', async () => {
		const buffer = await objectsToXlsxBuffer(
			[
				{
					name: 'Jonas & Ona <"test">',
					age: 30,
					active: true,
					joinedAt: new Date('2024-01-02T00:00:00Z'),
					formula: '=1+1'
				},
				{
					name: 'Line\nbreak',
					age: 28,
					active: false,
					joinedAt: new Date('2023-06-15T12:30:00Z'),
					formula: '-5'
				}
			],
			{ includeHeaders: true, sheetName: 'People' }
		);

		const zip = new PizZip(buffer);
		expect(zip.file('[Content_Types].xml')).toBeTruthy();
		expect(zip.file('_rels/.rels')).toBeTruthy();
		expect(zip.file('xl/workbook.xml')?.asText()).toContain('name="People"');
		expect(zip.file('xl/styles.xml')?.asText()).toContain('formatCode="yyyy-mm-dd"');

		const sheet = sheetXml(buffer);
		// Header row is bold and XML-escaped.
		expect(sheet).toContain('<c r="A1" s="1" t="inlineStr">');
		expect(sheet).toContain('Jonas &amp; Ona &lt;&quot;test&quot;&gt;');
		expect(sheet).toContain('<t xml:space="preserve">Line\nbreak</t>');
		// Numbers, booleans and dates stay native cell types.
		expect(sheet).toContain('<c r="B2"><v>30</v></c>');
		expect(sheet).toContain('<c r="C2" t="b"><v>1</v></c>');
		expect(sheet).toContain('<c r="C3" t="b"><v>0</v></c>');
		expect(sheet).toContain('<c r="D2" s="2"><v>45293</v></c>');
		expect(sheet).toContain('<c r="D3" s="3"><v>45092.520833333336</v></c>');
		// Strings stay inline text even when they look like formulas.
		expect(sheet).toContain(
			'<c r="E2" t="inlineStr"><is><t xml:space="preserve">=1+1</t></is></c>'
		);
	});

	it('uses multi-letter column references', async () => {
		const buffer = await rowsToXlsxBuffer([
			Array.from({ length: 28 }, (_, index) => index),
			Array.from({ length: 28 }, (_, index) => index)
		]);

		const sheet = sheetXml(buffer);
		expect(sheet).toContain('<c r="Z1"><v>25</v></c>');
		expect(sheet).toContain('<c r="AA1"><v>26</v></c>');
		expect(sheet).toContain('<c r="AB1"><v>27</v></c>');
	});

	it('writes an empty sheet', async () => {
		const buffer = await rowsToXlsxBuffer([]);
		expect(sheetXml(buffer)).toContain('<dimension ref="A1"/>');
	});

	it('is reproducible', async () => {
		const rows = [{ name: 'Jonas', age: 30 }];
		const first = await objectsToXlsxBuffer(rows, { includeHeaders: true });
		const second = await objectsToXlsxBuffer(rows, { includeHeaders: true });

		expect(first.equals(second)).toBe(true);
	});

	it('applies explicit column widths', async () => {
		const buffer = await objectsToXlsxBuffer([{ name: 'Jonas' }], {
			columnWidths: [25],
			autoWidth: false
		});

		expect(sheetXml(buffer)).toContain('<col min="1" max="1" width="25" customWidth="1"/>');
	});
});

describe('csv writer', () => {
	it('quotes values, protects formulas and keeps numbers numeric', () => {
		const csv = objectsToCsv(
			[
				{
					name: 'Ona, "O."',
					note: 'line\nbreak',
					value: -5,
					formula: '=1+1'
				}
			],
			{ eol: '\n' }
		);

		expect(csv).toBe('name,note,value,formula\n"Ona, ""O.""","line\nbreak",-5,\'=1+1');
	});

	it('supports a BOM for Excel', () => {
		expect(objectsToCsv([{ name: 'Ona' }], { bom: true })).toBe('\uFEFFname\r\nOna');
	});

	it('selects and labels columns', () => {
		const csv = objectsToCsv([{ b: 2, a: 1 }], {
			headers: ['A', 'B'],
			keys: ['a', 'b'],
			eol: '\n'
		});

		expect(csv).toBe('A,B\n1,2');
	});

	it('writes headers even when there are no rows', () => {
		expect(objectsToCsv([], { headers: ['A', 'B'] })).toBe('A,B');
	});

	it('serializes raw rows without headers', () => {
		expect(rowsToCsv([['Jonas', 30]], { eol: '\n' })).toBe('Jonas,30');
	});
});

describe('tsv writer', () => {
	it('flattens tabs and newlines for clipboard pasting', () => {
		expect(objectsToTsv([{ name: 'Ona\tO.\nOnaitė' }])).toBe('name\nOna O. Onaitė');
	});

	it('protects formulas and supports raw rows', () => {
		expect(rowsToTsv([['=1+1', '-5']])).toBe("'=1+1\t-5");
	});
});
