import { describe, expect, it, vi } from 'vitest';
import { createS3Backend, type S3StorageClient } from '../src/index.js';

function makeClient(overrides: Partial<S3StorageClient> = {}) {
	const objects = new Map<string, Buffer>();
	const signedUrl = vi.fn(async ({ key }: { key: string }) => ({
		signedUrl: `https://s3.example/${key}?signed`,
		expiresAt: Date.now() + 60_000,
		error: null
	}));

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
		getSignedUrl: signedUrl,
		...overrides
	};

	return { client, objects, signedUrl };
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
