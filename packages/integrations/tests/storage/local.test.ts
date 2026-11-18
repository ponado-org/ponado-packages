import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalBackend, parseRange } from '../../src/storage/index.js';

const roots: string[] = [];

async function makeBackend() {
	const root = await mkdtemp(join(tmpdir(), 'ponado-storage-'));
	roots.push(root);
	return { root, backend: createLocalBackend(root) };
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}

afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('local storage backend', () => {
	it('writes, reads and deletes an object', async () => {
		const { root, backend } = await makeBackend();
		const body = Buffer.from('hello world');

		await backend.init();
		await expect(
			backend.put({ key: 'abc.txt', body, contentType: 'text/plain' })
		).resolves.toEqual({ key: 'abc.txt' });

		await expect(backend.get('abc.txt')).resolves.toEqual(body);
		await expect(readFile(join(root, 'abc.txt'))).resolves.toEqual(body);

		await backend.delete('abc.txt');
		await expect(backend.get('abc.txt')).resolves.toBeNull();
	});

	it('creates nested directories for keys containing slashes', async () => {
		const { root, backend } = await makeBackend();
		const body = Buffer.from('nested');

		await backend.put({ key: 'a/b/c.txt', body, contentType: 'text/plain' });

		await expect(readFile(join(root, 'a', 'b', 'c.txt'))).resolves.toEqual(body);
	});

	it('returns null for missing objects and delete is idempotent', async () => {
		const { backend } = await makeBackend();

		await expect(backend.get('missing.txt')).resolves.toBeNull();
		await expect(backend.open('missing.txt')).resolves.toBeNull();
		await expect(backend.delete('missing.txt')).resolves.toBeUndefined();
	});

	it('lists objects with metadata and filters by prefix', async () => {
		const { backend } = await makeBackend();

		await backend.put({ key: 'a/one.txt', body: Buffer.from('1'), contentType: 'text/plain' });
		await backend.put({ key: 'a/two.txt', body: Buffer.from('2'), contentType: 'text/plain' });
		await backend.put({
			key: 'b/three.txt',
			body: Buffer.from('3'),
			contentType: 'text/plain'
		});

		const all = await backend.list();
		expect(all.map((object) => object.key).sort()).toEqual([
			'a/one.txt',
			'a/two.txt',
			'b/three.txt'
		]);
		expect(all.every((object) => object.lastModified instanceof Date)).toBe(true);
		expect(all.every((object) => typeof object.size === 'number')).toBe(true);

		const prefixed = await backend.list({ prefix: 'a/' });
		expect(prefixed.map((object) => object.key).sort()).toEqual(['a/one.txt', 'a/two.txt']);
	});

	it('deleteMany removes every key and is idempotent', async () => {
		const { backend } = await makeBackend();

		await backend.put({ key: 'one.txt', body: Buffer.from('1'), contentType: 'text/plain' });
		await backend.put({ key: 'two.txt', body: Buffer.from('2'), contentType: 'text/plain' });

		await backend.deleteMany(['one.txt', 'two.txt', 'missing.txt']);

		await expect(backend.get('one.txt')).resolves.toBeNull();
		await expect(backend.get('two.txt')).resolves.toBeNull();
		await expect(backend.list()).resolves.toEqual([]);
	});

	it('opens a whole object as a stream', async () => {
		const { backend } = await makeBackend();
		const body = Buffer.from('stream me');

		await backend.put({ key: 'abc.txt', body, contentType: 'text/plain' });

		const result = await backend.open('abc.txt');
		expect(result?.kind).toBe('stream');
		if (result?.kind !== 'stream') throw new Error('expected a stream');

		expect(result.size).toBe(body.byteLength);
		expect(result.total).toBe(body.byteLength);
		expect(result.range).toBeUndefined();
		await expect(readStream(result.stream)).resolves.toEqual(body);
	});

	it('serves byte ranges', async () => {
		const { backend } = await makeBackend();
		const body = Buffer.from('0123456789');

		await backend.put({ key: 'abc.txt', body, contentType: 'text/plain' });

		const result = await backend.open('abc.txt', { range: 'bytes=2-4' });
		expect(result?.kind).toBe('stream');
		if (result?.kind !== 'stream') throw new Error('expected a stream');

		expect(result.size).toBe(3);
		expect(result.total).toBe(10);
		expect(result.range).toEqual({ start: 2, end: 4, total: 10 });
		await expect(readStream(result.stream)).resolves.toEqual(Buffer.from('234'));
	});

	it('rejects unsatisfiable ranges', async () => {
		const { backend } = await makeBackend();
		await backend.put({ key: 'abc.txt', body: Buffer.from('abc'), contentType: 'text/plain' });

		await expect(backend.open('abc.txt', { range: 'bytes=9-' })).resolves.toEqual({
			kind: 'rangeNotSatisfiable',
			total: 3
		});
	});

	it('rejects keys that escape the storage root', async () => {
		const { backend } = await makeBackend();
		const body = Buffer.from('nope');

		await expect(backend.get('../../etc/passwd')).rejects.toThrow('escapes upload root');
		await expect(backend.open('../../etc/passwd')).rejects.toThrow('escapes upload root');
		await expect(
			backend.put({ key: '../escape.txt', body, contentType: 'text/plain' })
		).rejects.toThrow('escapes upload root');
		await expect(backend.delete('../../etc/passwd')).rejects.toThrow('escapes upload root');
	});
});

describe('parseRange', () => {
	it('parses open-ended, bounded and suffix ranges', () => {
		expect(parseRange('bytes=0-0', 10)).toEqual({ start: 0, end: 0 });
		expect(parseRange('bytes=5-', 10)).toEqual({ start: 5, end: 9 });
		expect(parseRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 });
		expect(parseRange('bytes=5-100', 10)).toEqual({ start: 5, end: 9 });
	});

	it('ignores headers it should not act on', () => {
		expect(parseRange(undefined, 10)).toBeNull();
		expect(parseRange('items=0-1', 10)).toBeNull();
		expect(parseRange('bytes=0-1,4-5', 10)).toBeNull();
	});

	it('flags unsatisfiable ranges', () => {
		expect(parseRange('bytes=10-', 10)).toBe('invalid');
		expect(parseRange('bytes=5-4', 10)).toBe('invalid');
		expect(parseRange('bytes=0-', 0)).toBe('invalid');
	});
});
