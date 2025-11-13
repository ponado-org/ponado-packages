import pLimit from 'p-limit';
import { PDFDocument } from 'pdf-lib';
import { executeCliWithFiles } from './cli-utils.js';
import fs from 'node:fs/promises';

export async function mergePdfs(pdfBuffers: Buffer[]): Promise<Buffer> {
	const mergedPdf = await PDFDocument.create();

	for (const pdfBytes of pdfBuffers) {
		const pdf = await PDFDocument.load(pdfBytes);
		const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
		copiedPages.forEach((page) => mergedPdf.addPage(page));
	}

	const mergedPdfBytes = await mergedPdf.save();
	return Buffer.from(mergedPdfBytes);
}

const pdfGenerationLimit = pLimit(1); // max 3 concurrent jobs globally

export async function convertSvgToPdf(svg: string): Promise<Buffer> {
	return executeCliWithFiles<string, Buffer>('inkscape', svg, {
		inputExt: 'svg',
		outputExt: 'pdf',
		env: { INKSCAPE_NO_DBUS: '1' },

		buildArgs: (inputFile, outputFile, options) => {
			const args = [inputFile, `--export-filename=${outputFile}`, '--export-type=pdf'];

			// Default to converting text to paths unless explicitly disabled
			if (options?.textToPaths !== false) {
				args.push('--export-text-to-path');
			}

			return args;
		},

		processOutput: async (outputFile) => {
			return await fs.readFile(outputFile);
		}
	});
}

export async function mergeSvgsIntoPdf(svgs: string[]): Promise<Buffer> {
	const pdfBuffers = await Promise.all(
		svgs.map((svg) => pdfGenerationLimit(() => convertSvgToPdf(svg)))
	);

	const mergedPdfBuffer = await mergePdfs(pdfBuffers);

	return mergedPdfBuffer;
}

// Function to split PDF into single-page PDFs
export async function splitPdfByPage(pdfBuffer: Buffer) {
	const pdfDoc = await PDFDocument.load(pdfBuffer);
	const pageCount = pdfDoc.getPageCount();
	const outputPdfs: Buffer[] = [];

	for (let i = 0; i < pageCount; i++) {
		const newPdf = await PDFDocument.create();
		const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
		newPdf.addPage(copiedPage);
		const pdfBytes = await newPdf.save();
		outputPdfs.push(Buffer.from(pdfBytes));
	}

	return outputPdfs;
}
