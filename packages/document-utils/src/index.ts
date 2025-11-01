import { Readable, Writable } from "node:stream";

//@ts-ignore
import XlsxWriteStream from 'xlsx-write-stream';

export async function CsvToXlsxBuffer(rows: (string | number | Date)[][] | Record<string, string | number | Date>[]): Promise<Buffer> {
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

export function substituteBuffer(params: {
	buffer: string;
	substitutions: Record<string, string>;
}) {
	let modifiedBuffer = params.buffer;
	for (const [placeholder, value] of Object.entries(params.substitutions)) {
		const regex = new RegExp(`{{${placeholder}}}`, 'g');
		modifiedBuffer = modifiedBuffer.replace(regex, value);
	}
	return modifiedBuffer;
}
