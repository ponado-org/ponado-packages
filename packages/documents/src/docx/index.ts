import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { executeCliWithFiles } from '../cli/index.js';
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

const DOCX_BODY_OPEN = '<w:body>';
const DOCX_SECT_PR = '<w:sectPr';
const DOCX_PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

/** Parts that must match for bodies from different documents to be concatenated safely. */
const SHARED_DOCX_PARTS = [
	'word/styles.xml',
	'word/numbering.xml',
	'word/_rels/document.xml.rels'
] as const;

type DocxBody = {
	/** XML up to and including `<w:body>`. */
	head: string;
	/** Body content without the final section properties. */
	body: string;
	/** Final `<w:sectPr>` onward, including `</w:body>`. */
	tail: string;
};

function readDocxBody(buffer: Buffer): DocxBody {
	const xml = new PizZip(buffer).file('word/document.xml')?.asText();
	if (!xml) throw new Error('mergeDocxBuffers: word/document.xml is missing');

	const bodyStart = xml.indexOf(DOCX_BODY_OPEN);
	const sectPrStart = xml.lastIndexOf(DOCX_SECT_PR);
	if (bodyStart === -1 || sectPrStart === -1) {
		throw new Error('mergeDocxBuffers: unsupported word/document.xml structure');
	}

	return {
		head: xml.slice(0, bodyStart + DOCX_BODY_OPEN.length),
		body: xml.slice(bodyStart + DOCX_BODY_OPEN.length, sectPrStart),
		tail: xml.slice(sectPrStart)
	};
}

function assertSameTemplate(base: PizZip, other: PizZip) {
	for (const part of SHARED_DOCX_PARTS) {
		const basePart = base.file(part)?.asText();
		const otherPart = other.file(part)?.asText();
		if (basePart !== otherPart) {
			throw new Error(
				`mergeDocxBuffers: ${part} differs between documents; only files rendered ` +
					'from the same DOCX template can be merged'
			);
		}
	}
}

/**
 * Concatenates DOCX files rendered from the same template into one document,
 * with a page break between them.
 *
 * Only the first document's package is kept, so every document must share the
 * template's styles, numbering and relationships. That makes the merge a body
 * concatenation instead of a general OOXML merge, and is what keeps it fast
 * enough to run before a single LibreOffice conversion. Headers and footers
 * also come from the first document.
 *
 * Merging unrelated documents is rejected: pass them to LibreOffice or merge
 * the resulting PDFs instead.
 */
export async function mergeDocxBuffers(buffers: Buffer[]): Promise<Buffer> {
	if (buffers.length === 0) {
		throw new Error('mergeDocxBuffers: at least one DOCX buffer is required');
	}
	if (buffers.length === 1) {
		return buffers[0];
	}

	const [first, ...rest] = buffers;
	const firstBody = readDocxBody(first);
	const base = new PizZip(first);
	const bodies: string[] = [firstBody.body];

	for (const buffer of rest) {
		const zip = new PizZip(buffer);
		assertSameTemplate(base, zip);
		bodies.push(readDocxBody(buffer).body);
	}

	base.file(
		'word/document.xml',
		`${firstBody.head}${bodies.join(DOCX_PAGE_BREAK)}${firstBody.tail}`
	);

	return base.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}
