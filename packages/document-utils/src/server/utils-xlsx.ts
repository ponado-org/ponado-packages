import { Readable, Writable } from "stream";
import XLSXTransformStream from "xlsx-write-stream";

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


import XlsxWriteStream from 'xlsx-write-stream';

export async function rowsToXlsxBuffer(rows: (string | number | Date)[][] | Record<string, string | number | Date>[]): Promise<Buffer> {
	// Create a readable stream from the rows
	const inputStream = Readable.from(rows);

	// Create the XLSX transform
	const xlsxStream = new XlsxWriteStream();

	// Collect chunks in memory
	const chunks: Buffer[] = [];
	const writable = new Writable({
		write(chunk, _encoding, callback) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			callback();
		}
	});

	return new Promise<Buffer>((resolve, reject) => {
		inputStream
			.pipe(xlsxStream)
			.pipe(writable)
			.on("finish", () => resolve(Buffer.concat(chunks)))
			.on("error", (err) => reject(err));
	});
}


