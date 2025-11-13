import { describe, expect, it } from 'vitest';
import { docxToString } from '../src/server';
import { loadFixture } from './utils';

describe('text extraction from docx', () => {
	const input = '{{vardas}} {{pavarde}}';
	it(`Test: ${input}`, async () => {
		const file = loadFixture('vardas_pavarde.docx');
		const txt = docxToString(file);
		expect(txt).toBe('{{vardas}} {{pavarde}}');
	});

	it(`Test: hello world`, async () => {
		const file = loadFixture('hello_world.docx');
		const txt = docxToString(file);
		expect(txt).toBe('hello world');
	});
});
