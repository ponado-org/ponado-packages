import { afterEach, describe, expect, it, vi } from 'vitest';
import { GotenbergClient } from '../src/pdf/index.js';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('GotenbergClient signing', () => {
	it('signs a PDF with a PKCS#12 certificate and PAdES options', async () => {
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			const requested = url instanceof Request ? url.url : url.toString();
			expect(requested).toBe('http://gotenberg:3000/forms/pdf/sign');

			const body = init?.body as FormData;
			const files = body.getAll('files') as File[];
			expect(files.map((file) => file.name)).toEqual(['card.pdf', 'issuer.p12']);
			expect(body.get('certificate')).toBe('issuer.p12');
			expect(body.get('certificatePassword')).toBe('secret');
			expect(body.get('pades')).toBe('true');
			expect(body.get('name')).toBe('Ponado');
			expect(body.get('reason')).toBe('Original document');
			expect(body.get('location')).toBe('Vilnius');
			expect(body.get('contactInfo')).toBe('docs@example.com');
			expect(body.get('timestampUrl')).toBe('http://timestamp.digicert.com');

			return new Response(new Uint8Array([7, 8]));
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new GotenbergClient({ url: 'http://gotenberg:3000' });
		const signed = await client.signPdf(new Uint8Array([1]), {
			certificate: {
				kind: 'pkcs12',
				data: new Uint8Array([2]),
				filename: 'issuer.p12',
				password: 'secret'
			},
			filename: 'card.pdf',
			pades: true,
			name: 'Ponado',
			reason: 'Original document',
			location: 'Vilnius',
			contactInfo: 'docs@example.com',
			timestampUrl: 'http://timestamp.digicert.com'
		});

		expect([...signed]).toEqual([7, 8]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('signs a PDF with a PEM certificate and private key', async () => {
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			const requested = url instanceof Request ? url.url : url.toString();
			expect(requested).toBe('http://gotenberg:3000/forms/pdf/sign');

			const body = init?.body as FormData;
			const files = body.getAll('files') as File[];
			expect(files.map((file) => file.name)).toEqual(['document.pdf', 'cert.pem', 'key.pem']);
			expect(body.get('certificate')).toBe('cert.pem');
			expect(body.get('key')).toBe('key.pem');
			expect(body.has('certificatePassword')).toBe(false);

			return new Response(new Uint8Array([9]));
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new GotenbergClient({ url: 'http://gotenberg:3000' });
		const result = await client.signPdf(new Uint8Array([1]), {
			certificate: {
				kind: 'pem',
				certificate: { data: '-----BEGIN CERTIFICATE-----', filename: 'cert.pem' },
				key: { data: '-----BEGIN PRIVATE KEY-----', filename: 'key.pem' }
			}
		});

		expect([...result]).toEqual([9]);
	});

	it('adds an RFC 3161 document timestamp', async () => {
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			const requested = url instanceof Request ? url.url : url.toString();
			expect(requested).toBe('http://gotenberg:3000/forms/pdf/timestamp');

			const body = init?.body as FormData;
			const files = body.getAll('files') as File[];
			expect(files.map((file) => file.name)).toEqual(['card.pdf']);
			expect(body.get('timestampUrl')).toBe('http://timestamp.digicert.com');

			return new Response(new Uint8Array([3, 4]));
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new GotenbergClient({ url: 'http://gotenberg:3000' });
		const timestamped = await client.timestampPdf(new Uint8Array([1]), {
			timestampUrl: 'http://timestamp.digicert.com',
			filename: 'card.pdf'
		});

		expect([...timestamped]).toEqual([3, 4]);
	});

	it('reads PDF info and reports whether it is signed', async () => {
		const info = {
			pages: 1,
			version: '1.7',
			encrypted: false,
			tagged: false,
			linearized: false,
			formFields: false,
			signed: true
		};
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			const requested = url instanceof Request ? url.url : url.toString();
			expect(requested).toBe('http://gotenberg:3000/forms/pdf/info');

			const body = init?.body as FormData;
			const files = body.getAll('files') as File[];
			expect(files.map((file) => file.name)).toEqual(['card.pdf']);
			expect(body.get('password')).toBe('secret');

			return new Response(JSON.stringify({ 'card.pdf': info }), {
				headers: { 'Content-Type': 'application/json' }
			});
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new GotenbergClient({ url: 'http://gotenberg:3000' });
		const result = await client.pdfInfo(new Uint8Array([1]), {
			filename: 'card.pdf',
			password: 'secret'
		});

		expect(result).toEqual(info);
	});
});
