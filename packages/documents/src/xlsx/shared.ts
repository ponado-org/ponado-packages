/** A value that can be written to an XLSX/CSV cell. */
export type TableCell = string | number | boolean | Date | null | undefined;

/** A row of cell values. */
export type TableRow = readonly TableCell[];

/** A row of cells keyed by column name. */
export type TableObject = Record<string, TableCell>;

export interface ObjectTableOptions<T extends TableObject = TableObject> {
	/** Prepend a header row. */
	includeHeaders?: boolean;
	/** Header labels; defaults to the object keys. */
	headers?: string[];
	/** Object keys to export, in order; defaults to the first object's keys. */
	keys?: (keyof T)[];
}

/** Turns objects into rows, optionally prepending a header row. */
export function objectsToRows<T extends TableObject>(
	objects: readonly T[],
	options: ObjectTableOptions<T> = {}
): TableRow[] {
	const keys: (keyof T)[] =
		options.keys ?? (objects[0] ? (Object.keys(objects[0]) as (keyof T)[]) : []);

	const rows: TableRow[] = objects.map((object) => keys.map((key) => object[key] ?? ''));

	if (options.includeHeaders) {
		rows.unshift(options.headers ?? keys.map(String));
	}

	return rows;
}

/** Formats a cell as plain text, matching spreadsheet display conventions. */
export function cellText(value: TableCell): string {
	if (value == null) return '';
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? '' : value.toISOString();
	}
	return String(value);
}

/**
 * Spreadsheet apps execute cells that start with a formula character. Exports
 * come from user data, so those cells are prefixed with an apostrophe.
 */
export function startsWithFormula(text: string): boolean {
	if (/^[=+@\t\r]/.test(text)) return true;

	// A leading minus is only dangerous when the cell is not a plain number.
	return text.startsWith('-') && !Number.isFinite(Number(text));
}
