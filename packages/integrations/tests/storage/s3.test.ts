import { describe, expect, it, vi } from 'vitest';
import { createS3Backend, type S3StorageClient } from '../../src/storage/index.js';

function makeClient(overrides: Partial<S3StorageClient> = {}) {
	const objects = new Map<string, Buffer>();
	const signedUrl = vi.fn(async ({ key }: { key: string }) => ({
		signedUrl: `https://s3.example/${key}?signed`,
		expiresAt: Date.now() + 60_000,
		error: null
	}));
	const listObjects = vi.fn(async () => [
		{ key: 'abc.txt', lastModified: new Date('2026-01-01T00:00:00Z'), size: 9 }
	]);
	const deleteObjects = vi.fn(async ({ keys }: { keys: string[] }) => {
		for (const key of keys) objects.delete(key);
		return null;
	});

	const client: S3StorageClient = {
		async putObject({ key, file }) {
			objects.set(key, file);
			return { key };
		},
		async getObject({ key }) {
			const object = objects.get(key);
			return object
				? { ok: true as const, objectBuffer: object }
				: { ok: false as const, error: 'not found' };
		},
		async deleteObject({ key }) {
			objects.delete(key);
			return null;
		},
		listObjects,
		deleteObjects,
		getSignedUrl: signedUrl,
		...overrides
	};

	return { client, objects, signedUrl, listObjects, deleteObjects };
}

describe('S3 storage backend', () => {
	it('writes, reads and deletes through the injected client', async () => {
		const { client, objects } = makeClient();
		const backend = createS3Backend({ client, bucket: 'uploads' });
		const body = Buffer.from('hello s3');

		await expect(
			backend.put({ key: 'abc.txt', body, contentType: 'text/plain' })
		).resolves.toEqual({ key: 'abc.txt' });
		expect(objects.get('abc.txt')).toEqual(body);

		await expect(backend.get('abc.txt')).resolves.toEqual(body);
		await expect(backend.get('missing.txt')).resolves.toBeNull();

		await backend.delete('abc.txt');
		expect(objects.has('abc.txt')).toBe(false);
	});

	it('throws when the client reports a delete error', async () => {
		const { client } = makeClient({
			deleteObject: async () => 'permission denied'
		});
		const backend = createS3Backend({ client });

		await expect(backend.delete('abc.txt')).rejects.toThrow('permission denied');
	});

	it('lists objects through the injected client', async () => {
		const { client, listObjects } = makeClient();
		const backend = createS3Backend({ client, bucket: 'uploads' });

		const objects = await backend.list({ prefix: 'a/' });

		expect(objects).toEqual([
			{ key: 'abc.txt', lastModified: new Date('2026-01-01T00:00:00Z'), size: 9 }
		]);
		expect(listObjects).toHaveBeenCalledWith({ bucket: 'uploads', prefix: 'a/' });
	});

	it('deleteMany uses the batch client and throws on per-key errors', async () => {
		const deleteObjects = vi.fn(async () => 'abc.txt: AccessDenied');
		const { client } = makeClient({ deleteObjects });
		const backend = createS3Backend({ client, bucket: 'uploads' });

		await expect(backend.deleteMany(['abc.txt'])).rejects.toThrow('AccessDenied');
		expect(deleteObjects).toHaveBeenCalledWith({ keys: ['abc.txt'], bucket: 'uploads' });
	});

	it('deleteMany falls back to deleteObject when the client has no batch support', async () => {
		const { client } = makeClient();
		client.deleteObjects = undefined;
		const backend = createS3Backend({ client });

		await backend.put({ key: 'abc.txt', body: Buffer.from('x'), contentType: 'text/plain' });
		await backend.deleteMany(['abc.txt', 'missing.txt']);

		await expect(backend.get('abc.txt')).resolves.toBeNull();
	});

	it('redirects to a signed URL and forwards delivery options', async () => {
		const { client, signedUrl } = makeClient();
		const backend = createS3Backend({ client, bucket: 'uploads' });

		await expect(
			backend.open('abc.txt', {
				filename: 'report.pdf',
				download: true,
				expiresIn: 120
			})
		).resolves.toEqual({
			kind: 'redirect',
			url: 'https://s3.example/abc.txt?signed'
		});

		expect(signedUrl).toHaveBeenCalledWith({
			key: 'abc.txt',
			bucket: 'uploads',
			filename: 'report.pdf',
			download: true,
			expirityTime: 120
		});
	});

	it('creates the bucket on init when ensureBucket is enabled', async () => {
		let exists = false;
		const createBucket = vi.fn(async () => {
			exists = true;
			return {};
		});
		const { client } = makeClient({
			bucketExists: async () => exists,
			createBucket
		});
		const backend = createS3Backend({ client, bucket: 'uploads', ensureBucket: true });

		await backend.init();

		expect(createBucket).toHaveBeenCalledWith({ name: 'uploads' });
		expect(exists).toBe(true);
	});

	it('uses the check callback when provided', async () => {
		const { client } = makeClient();
		const check = vi.fn(async () => {});
		const backend = createS3Backend({ client, check });

		await backend.check();
		expect(check).toHaveBeenCalledOnce();
	});
});
