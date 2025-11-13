import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { executeCliWithFiles } from './cli-utils.js';
import fs from 'node:fs/promises';

export type DocxtemplaterOptions = {
	delimiters?: { start: string | null; end: string | null };
	paragraphLoop?: boolean;
	errorLogging?: boolean | string;
	linebreaks?: boolean;
	stripInvalidXMLChars?: boolean;
};

const DefaultDocxtemplaterOptions: DocxtemplaterOptions = {
	paragraphLoop: true,
	linebreaks: true,
	delimiters: { start: '{{', end: '}}' }
};

/**
 * Convert a .docx file (as Buffer or ArrayBuffer) to plain text.
 * @param data - The DOCX file data
 * @returns The extracted text
 */
export function docxToString(
	data: Buffer | ArrayBuffer,
	opt: DocxtemplaterOptions = DefaultDocxtemplaterOptions
): string {
	const zip = new PizZip(data);
	const doc = new Docxtemplater(zip, opt);
	return doc.getFullText();
}

export function renderDocxTemplate({
	docxTemplate,
	substitutions,
	options = DefaultDocxtemplaterOptions
}: {
	docxTemplate: Buffer;
	substitutions: DocxtemplaterOptions;
	options?: DocxtemplaterOptions;
}) {
	// Unzip the content
	const zip = new PizZip(docxTemplate);

	// Parse the template
	const doc = new Docxtemplater(zip, options);

	// Render with data
	doc.render(substitutions);

	// Get the rendered DOCX as buffer
	const docxBuf = doc.toBuffer();
	return docxBuf;
}

/** Converts a DOCX Buffer or string to a PDF Buffer using LibreOffice */
export async function docxToPdf(input: Buffer | string): Promise<Buffer> {
	return await executeCliWithFiles('libreoffice', input, {
		inputExt: 'docx',
		outputExt: 'pdf',

		// LibreOffice CLI arguments
		buildArgs: (inputFile, outputFile) => [
			'--headless',
			'--convert-to',
			'pdf',
			'--outdir',
			require('path').dirname(outputFile),
			inputFile
		],

		// Read PDF result back as Buffer
		processOutput: async (outputFile) => {
			return await fs.readFile(outputFile);
		}
	});
}

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export async function mergeDocxBuffers(buffers: Buffer[]): Promise<Buffer> {
	const DocxMerger = require('docx-merger');
	const docx = new DocxMerger({}, buffers);
	return new Promise((resolve, reject) => {
		docx.save('nodebuffer', (data: Buffer) => {
			if (data) {
				resolve(data);
			} else {
				reject(new Error('Failed to merge documents'));
			}
		});
	});
}
