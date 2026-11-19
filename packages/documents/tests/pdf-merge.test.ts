import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergePdfs } from '../src/pdf/index.js';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('mergePdfs', () => {
	it('posts zero-padded files to Gotenberg and returns the merged bytes', async () => {
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			const requested = url instanceof Request ? url.url : url.toString();
			expect(requested).toBe('http://gotenberg:3000/forms/pdfengines/merge');
			const body = init?.body as FormData;
			const files = body.getAll('files') as File[];
			expect(files.map((file) => file.name)).toEqual(['0000.pdf', '0001.pdf']);
			return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
		});
		vi.stubGlobal('fetch', fetchMock);

		const result = await mergePdfs([new Uint8Array([1]), new Uint8Array([2])], {
			url: 'http://gotenberg:3000/'
		});

		expect([...result]).toEqual([1, 2, 3]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('returns the only PDF without calling the service', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		const result = await mergePdfs([new Uint8Array([9])], { url: 'http://gotenberg:3000' });

		expect([...result]).toEqual([9]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('reports Gotenberg failures with response detail', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('bad input', { status: 400 }))
		);

		await expect(
			mergePdfs([new Uint8Array([1]), new Uint8Array([2])], { url: 'http://gotenberg:3000' })
		).rejects.toThrow('Gotenberg merge failed (400): bad input');
	});
});
