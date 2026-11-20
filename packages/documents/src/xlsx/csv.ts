import {
	cellText,
	objectsToRows,
	startsWithFormula,
	type ObjectTableOptions,
	type TableCell,
	type TableObject,
	type TableRow
} from './shared.js';

export interface CsvOptions {
	/** Prefix the output with a UTF-8 BOM so Excel keeps non-ASCII text. */
	bom?: boolean;
	/** Field delimiter. Defaults to `,`. */
	delimiter?: string;
	/** Line ending. Defaults to `\r\n` (RFC 4180). */
	eol?: string;
	/** Prefix cells that spreadsheet apps could execute as formulas. Defaults to `true`. */
	escapeFormulas?: boolean;
}

export type ObjectCsvOptions<T extends TableObject> = ObjectTableOptions<T> & CsvOptions;

function csvCell(value: TableCell, delimiter: string, escapeFormulas: boolean): string {
	let text = cellText(value);

	if (escapeFormulas && startsWithFormula(text)) {
		text = `'${text}`;
	}

	if (text.includes('"') || text.includes(delimiter) || /[\r\n]/.test(text)) {
		return `"${text.replaceAll('"', '""')}"`;
	}

	return text;
}

/** Serializes rows to RFC 4180 CSV. */
export function rowsToCsv(rows: readonly TableRow[], options: CsvOptions = {}): string {
	const delimiter = options.delimiter ?? ',';
	const eol = options.eol ?? '\r\n';
	const escapeFormulas = options.escapeFormulas ?? true;

	const body = rows
		.map((row) => row.map((cell) => csvCell(cell, delimiter, escapeFormulas)).join(delimiter))
		.join(eol);

	return options.bom ? `\uFEFF${body}` : body;
}

/** Serializes objects to RFC 4180 CSV, with a header row by default. */
export function objectsToCsv<T extends TableObject>(
	objects: readonly T[],
	options: ObjectCsvOptions<T> = {}
): string {
	return rowsToCsv(
		objectsToRows(objects, {
			includeHeaders: options.includeHeaders ?? true,
			headers: options.headers,
			keys: options.keys
		}),
		options
	);
}

export interface TsvOptions {
	/** Line ending. Defaults to `\n`. */
	eol?: string;
	/** Prefix cells that spreadsheet apps could execute as formulas. Defaults to `true`. */
	escapeFormulas?: boolean;
}

export type ObjectTsvOptions<T extends TableObject> = ObjectTableOptions<T> & TsvOptions;

/** Tabs and newlines would break a spreadsheet paste, so they are flattened. */
function tsvCell(value: TableCell, escapeFormulas: boolean): string {
	let text = cellText(value);

	if (escapeFormulas && startsWithFormula(text)) {
		text = `'${text}`;
	}

	return text.replaceAll('\t', ' ').replaceAll(/\r?\n/g, ' ');
}

/** Serializes rows to tab-separated text for clipboard pasting. */
export function rowsToTsv(rows: readonly TableRow[], options: TsvOptions = {}): string {
	const eol = options.eol ?? '\n';
	const escapeFormulas = options.escapeFormulas ?? true;

	return rows.map((row) => row.map((cell) => tsvCell(cell, escapeFormulas)).join('\t')).join(eol);
}

/** Serializes objects to tab-separated text, with a header row by default. */
export function objectsToTsv<T extends TableObject>(
	objects: readonly T[],
	options: ObjectTsvOptions<T> = {}
): string {
	return rowsToTsv(
		objectsToRows(objects, {
			includeHeaders: options.includeHeaders ?? true,
			headers: options.headers,
			keys: options.keys
		}),
		options
	);
}
