import { PDFDocument } from "pdf-lib";
import pLimit from 'p-limit';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Checks if a given program (binary) is available in the system PATH.
 * Works cross-platform (Windows, macOS, Linux).
 *
 * @param program - Name of the program to check (e.g. "git", "node")
 * @returns true if the program is found in PATH, false otherwise
 */
export async function isInPath(program: string): Promise<boolean> {
	const command = process.platform === 'win32'
		? `where ${program}`
		: `command -v ${program}`;

	try {
		await execAsync(command);
		return true;
	} catch {
		return false;
	}
}


type WorkflowOptions<Input, Output> = {
	/** Optional transform before writing input file (e.g., string -> Buffer) */
	prepareInput?: (input: Input) => Buffer | string;
	/** Optional function to generate arguments for the program */
	buildArgs: (inputFile: string, outputFile: string, opts?: any) => string[];
	/** Optional cleanup or post-processing of output file */
	processOutput?: (outputFile: string) => Promise<Output>;
	/** Default file extension for input file */
	inputExt?: string;
	/** Default file extension for output file */
	outputExt?: string;
	/** Additional environment variables */
	env?: NodeJS.ProcessEnv;
};

export async function runWorkflow<Input extends string | Buffer | NodeJS.ArrayBufferView, Output>(
	program: string,
	input: Input,
	opts: WorkflowOptions<Input, Output>
): Promise<Output> {

	const inPath = await isInPath(program)

	if (!inPath) {
		throw new Error(`Program: ${program}, was not found in path`)
	}

	const timestamp = Date.now();
	const random = crypto.randomBytes(4).toString('hex');

	const inputExt = opts.inputExt ?? 'tmp';
	const outputExt = opts.outputExt ?? 'tmp';

	const baseName = `workflow_${timestamp}_${random}`;
	const inputFile = path.join(os.tmpdir(), `${baseName}.${inputExt}`);
	const outputFile = path.join(os.tmpdir(), `${baseName}.${outputExt}`);

	try {
		// Write input to file
		const content = opts.prepareInput ? opts.prepareInput(input) : input;
		await fs.writeFile(inputFile, content);

		// Build arguments
		const args = opts.buildArgs(inputFile, outputFile, opts);

		const proc = spawn(program, args, {
			stdio: ['ignore', 'pipe', 'pipe'],
			env: { ...process.env, ...opts.env }
		});

		const result = await new Promise<{ stderr: string; exitCode: number | null }>((resolve, reject) => {
			let stderrData = '';
			proc.stderr.on('data', (data: Buffer) => {
				stderrData += data.toString();
			});

			proc.on('error', reject);

			proc.on('exit', (code) => {
				resolve({ stderr: stderrData, exitCode: code });
			});
		});

		if (result.exitCode !== 0) {
			console.error(`❌ ${program} failed:`, result.stderr);
			throw new Error(`${program} exited with code ${result.exitCode}`);
		}

		// Process output
		if (opts.processOutput) {
			return await opts.processOutput(outputFile);
		} else {
			return (await fs.readFile(outputFile)) as unknown as Output;
		}
	} finally {
		// Cleanup
		try {
			await fs.unlink(inputFile);
		} catch { }
		try {
			await fs.unlink(outputFile);
		} catch { }
	}
}


export async function mergePdfBuffers(pdfBuffers: Buffer[]): Promise<Buffer> {
	const mergedPdf = await PDFDocument.create();

	for (const pdfBytes of pdfBuffers) {
		const pdf = await PDFDocument.load(pdfBytes);
		const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
		copiedPages.forEach((page) => mergedPdf.addPage(page));
	}

	const mergedPdfBytes = await mergedPdf.save();
	return Buffer.from(mergedPdfBytes);
}



export const pdfGenerationLimit = pLimit(1); // max 3 concurrent jobs globally


export async function runSvgToPdf(
	svg: string,
): Promise<Buffer> {
	return runWorkflow<string, Buffer>('inkscape', svg, {
		inputExt: 'svg',
		outputExt: 'pdf',
		env: { INKSCAPE_NO_DBUS: '1' },

		buildArgs: (inputFile, outputFile, options) => {
			const args = [
				inputFile,
				`--export-filename=${outputFile}`,
				'--export-type=pdf'
			];

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


export async function generatePDFfromSVG(svgs: string[]): Promise<Buffer> {

	const pdfBuffers = await Promise.all(
		svgs.map(svg => pdfGenerationLimit(() => runSvgToPdf(svg)))
	);

	const mergedPdfBuffer = await mergePdfBuffers(pdfBuffers);

	return mergedPdfBuffer;
}


import { Readable, Writable } from 'stream';
import XLSXTransformStream from 'xlsx-write-stream';

type Cell = string | number | Date;
type Row = Cell[];

/**
 * Converts an array of objects into a 2D array for XLSX export.
 * Optionally prepends a header row with object keys.
 */
function objectsToRows<T extends Record<string, Cell>>(
	objects: T[],
	options: { includeHeaders?: boolean; headers?: string[]; keys?: (keyof T)[] } = {}
): Row[] {
	if (objects.length === 0) return [];

	const keys: (keyof T)[] = options.keys ?? (Object.keys(objects[0] ?? {}) as (keyof T)[]);

	const rows: Row[] = objects.map((obj) => keys.map((k) => obj[k] ?? ''));

	if (options.includeHeaders) {
		const headerRow = options.headers ?? keys.map((k) => String(k));
		rows.unshift(headerRow);
	}

	return rows;
}

/**
 * Converts objects to XLSX and returns a buffer.
 */
export async function objectsToXlsxBuffer<T extends Record<string, Cell>>(
	objects: T[],
	options: { includeHeaders?: boolean; headers?: string[]; keys?: (keyof T)[] } = {}
): Promise<Buffer> {
	const rows = objectsToRows(objects, options);

	// Create a readable stream that emits each row individually
	const inputStream = new Readable({
		objectMode: true,
		read() {
			for (const row of rows) this.push(row);
			this.push(null);
		}
	});

	const xlsxStream = new XLSXTransformStream();

	const chunks: Buffer[] = [];
	const writable = new Writable({
		objectMode: true,
		write(chunk: any, _encoding, callback) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			callback();
		}
	});

	return new Promise<Buffer>((resolve, reject) => {
		inputStream
			.pipe(xlsxStream)
			.pipe(writable)
			.on('finish', () => resolve(Buffer.concat(chunks)))
			.on('error', reject);
	});
}


/**
 * Renders typst template to pdf buffer
 */
export async function typToPdf(template: string): Promise<Buffer> {
	const pdfBuffer = await runWorkflow<string, Buffer>('typst', template, {
		inputExt: 'typ',
		outputExt: 'pdf',
		buildArgs: (inputFile, outputFile) => ['compile', inputFile, '--format', 'pdf', outputFile]
	});

	return pdfBuffer;
}


function escapeString(str: string): string {
	if (!str) return '';
	return str
		.replace(/\\/g, '\\\\') // Escape backslashes first
		.replace(/\r/g, '') // remove carriage returns
		.replace(/"/g, '\\"') // Escape double quotes
		.replace(/\n/g, '\\n') // escape newlines
		.replace(/#/g, '\\#') // Escape hash symbols
		.replace(/\$/g, '\\$'); // Escape dollar signs
}

/**
 * Typst template string util that escapes strings
*/
export function typ(str: TemplateStringsArray | string, ...values: any[]): string {
	// If called as a regular function with a string
	if (typeof str === 'string') {
		return escapeString(str);
	}

	// If called as a template literal
	let result = '';
	for (let i = 0; i < str.length; i++) {
		result += str[i];
		if (i < values.length) {
			result += escapeString(String(values[i]));
		}
	}
	return result;
}


