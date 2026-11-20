import { describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import { docxToString, mergeDocxBuffers } from '../src/docx';
import { loadFixture } from './utils';

describe('mergeDocxBuffers', () => {
	it('concatenates documents rendered from the same template with a page break', async () => {
		const file = loadFixture('hello_world.docx');
		const merged = await mergeDocxBuffers([file, file]);

		expect(docxToString(merged).match(/hello world/g)).toHaveLength(2);
		const documentXml = new PizZip(merged).file('word/document.xml')?.asText() ?? '';
		expect(documentXml.match(/<w:br w:type="page"\/>/g)).toHaveLength(1);
	});

	it('returns a single buffer unchanged', async () => {
		const file = loadFixture('hello_world.docx');
		expect(await mergeDocxBuffers([file])).toBe(file);
	});

	it('rejects documents with different shared parts', async () => {
		const hello = loadFixture('hello_world.docx');
		const vardas = loadFixture('vardas_pavarde.docx');

		await expect(mergeDocxBuffers([hello, vardas])).rejects.toThrow(
			'only files rendered from the same DOCX template can be merged'
		);
	});
});
