import { afterEach, describe, expect, it, vi } from 'vitest';
import { GotenbergClient, GotenbergError } from '../src/pdf/index.js';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('GotenbergClient', () => {
	it('normalizes the route and serializes files, fields and headers', async () => {
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			const requested = url instanceof Request ? url.url : url.toString();
			expect(requested).toBe('http://gotenberg:3000/forms/libreoffice/convert');
			expect(init?.method).toBe('POST');
			expect(init?.headers).toEqual({
				Authorization: 'Basic token',
				'X-Request': 'request'
			});

			const body = init?.body as FormData;
			const files = body.getAll('files') as File[];
			expect(files.map((file) => file.name)).toEqual(['report.docx', 'chart.png']);
			expect(files.map((file) => file.type)).toEqual([
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'application/octet-stream'
			]);
			expect(body.getAll('landscape')).toEqual(['true']);
			expect(body.getAll('marginTop')).toEqual(['0.5']);
			expect(body.getAll('tag')).toEqual(['a', 'b']);
			expect(body.has('skip')).toBe(false);
			expect(body.has('ignored')).toBe(false);

			return new Response(new Uint8Array([1, 2, 3]));
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new GotenbergClient({
			url: 'http://gotenberg:3000/',
			headers: { Authorization: 'Basic token', 'X-Request': 'client' }
		});

		const result = await client.request('forms/libreoffice/convert', {
			files: [
				{
					data: new Uint8Array([1]),
					filename: 'report.docx',
					contentType:
						'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
				},
				{ data: new Uint8Array([2]), filename: 'chart.png' }
			],
			fields: {
				landscape: true,
				marginTop: 0.5,
				tag: ['a', 'b'],
				skip: undefined,
				ignored: null
			},
			headers: { 'X-Request': 'request' }
		});

		expect([...result]).toEqual([1, 2, 3]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('throws GotenbergError with the route, status and response detail', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('bad input', { status: 400 }))
		);

		const client = new GotenbergClient({ url: 'http://gotenberg:3000' });
		const error = await client.request('/forms/pdf/merge').catch((err: unknown) => err);

		expect(error).toBeInstanceOf(GotenbergError);
		expect(error).toMatchObject({
			route: '/forms/pdf/merge',
			status: 400,
			detail: 'bad input'
		});
		expect((error as Error).message).toBe(
			'Gotenberg request to /forms/pdf/merge failed (400): bad input'
		);
	});

	it('returns the raw response from post', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(null, { status: 204 }))
		);

		const client = new GotenbergClient({ url: 'http://gotenberg:3000' });
		const response = await client.post('/forms/chromium/convert/url', {
			fields: { url: 'https://example.com' }
		});

		expect(response.status).toBe(204);
	});

	it('rejects an empty URL', () => {
		expect(() => new GotenbergClient({ url: '  ' })).toThrow(
			'GotenbergClient: url is required'
		);
	});
});
