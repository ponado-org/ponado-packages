import { access, mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { constants, createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { dirname, join, normalize, relative, resolve, sep } from 'node:path';
import type {
	PutInput,
	StorageBackend,
	StorageListOptions,
	StorageObjectInfo,
	StorageOpenOptions,
	StorageReadResult
} from './types.js';

type ParsedRange = { start: number; end: number };

/**
 * Parse a single-range `Range` header. Returns null when the header should be
 * ignored (absent, malformed, or a multi-range request, which is answered with
 * the full object), or "invalid" when the range cannot be satisfied.
 */
export function parseRange(
	header: string | null | undefined,
	size: number
): ParsedRange | 'invalid' | null {
	if (!header) return null;

	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!match) return null;

	const [, rawStart, rawEnd] = match;
	if (!rawStart && !rawEnd) return null;
	if (size === 0) return 'invalid';

	if (!rawStart) {
		const suffix = Number(rawEnd);
		if (!Number.isSafeInteger(suffix) || suffix <= 0) return 'invalid';
		return { start: Math.max(size - suffix, 0), end: size - 1 };
	}

	const start = Number(rawStart);
	if (!Number.isSafeInteger(start) || start >= size) return 'invalid';

	if (!rawEnd) return { start, end: size - 1 };

	const end = Number(rawEnd);
	if (!Number.isSafeInteger(end) || end < start) return 'invalid';
	return { start, end: Math.min(end, size - 1) };
}

/**
 * Filesystem storage. Every key is resolved under `rootDir` and rejected if
 * it would escape it, so a malicious key can never reach another directory.
 */
export function createLocalBackend(rootDir: string): StorageBackend<'local'> {
	const ROOT = resolve(rootDir);

	function resolveKey(key: string): string {
		if (!key) throw new Error('storage: empty key');
		const full = resolve(join(ROOT, normalize(key)));
		if (full !== ROOT && !full.startsWith(ROOT + sep)) {
			throw new Error('storage: key escapes upload root');
		}
		return full;
	}

	/** Resolve a regular file, or null when it does not exist. */
	async function statKey(key: string) {
		const full = resolveKey(key);
		try {
			const info = await stat(full);
			return info.isFile() ? { full, size: info.size } : null;
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw err;
		}
	}

	/** Delete one key; missing keys are not an error. */
	async function removeKey(key: string) {
		const full = resolveKey(key);
		try {
			await unlink(full);
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
		}
	}

	async function listObjects(options?: StorageListOptions): Promise<StorageObjectInfo[]> {
		const prefix = options?.prefix ?? '';
		const objects: StorageObjectInfo[] = [];

		async function walk(dir: string) {
			let entries;
			try {
				entries = await readdir(dir, { withFileTypes: true });
			} catch (err) {
				if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
				throw err;
			}

			for (const entry of entries) {
				const fullPath = join(dir, entry.name);
				if (entry.isDirectory()) {
					await walk(fullPath);
					continue;
				}
				if (!entry.isFile()) continue;

				const key = relative(ROOT, fullPath).split(sep).join('/');
				if (!key.startsWith(prefix)) continue;

				const info = await stat(fullPath);
				objects.push({ key, lastModified: info.mtime, size: info.size });
			}
		}

		await walk(ROOT);
		return objects;
	}

	return {
		provider: 'local',

		async init() {
			await mkdir(ROOT, { recursive: true });
		},

		async check() {
			await mkdir(ROOT, { recursive: true });
			await access(ROOT, constants.W_OK);
		},

		async put({ key, body }: PutInput) {
			const full = resolveKey(key);
			await mkdir(dirname(full), { recursive: true });
			await writeFile(full, body);
			return { key };
		},

		async get(key: string): Promise<Buffer | null> {
			const file = await statKey(key);
			if (!file) return null;
			return readFile(file.full);
		},

		async delete(key: string): Promise<void> {
			await removeKey(key);
		},

		async deleteMany(keys: string[]): Promise<void> {
			for (const key of keys) {
				await removeKey(key);
			}
		},

		list: listObjects,

		async open(key: string, opts?: StorageOpenOptions): Promise<StorageReadResult | null> {
			const file = await statKey(key);
			if (!file) return null;

			const range = parseRange(opts?.range, file.size);
			if (range === 'invalid') {
				return { kind: 'rangeNotSatisfiable', total: file.size };
			}

			if (range) {
				const stream = createReadStream(file.full, { start: range.start, end: range.end });
				return {
					kind: 'stream',
					stream: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
					size: range.end - range.start + 1,
					total: file.size,
					range: { ...range, total: file.size }
				};
			}

			return {
				kind: 'stream',
				stream: Readable.toWeb(createReadStream(file.full)) as ReadableStream<Uint8Array>,
				size: file.size,
				total: file.size
			};
		}
	};
}
