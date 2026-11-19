/** A file part in a Gotenberg multipart request. */
export type GotenbergFile = {
	/** File contents. Strings are sent as UTF-8 text. */
	data: Blob | Uint8Array | ArrayBuffer | string;
	/** Filename sent to Gotenberg; the extension selects the engine input. */
	filename: string;
	/** MIME type (default `application/octet-stream`). */
	contentType?: string;
};

/** Binary content accepted by Gotenberg's PDF routes. */
export type GotenbergBinary = Blob | Uint8Array | ArrayBuffer;

/** Certificate formats accepted by `GotenbergClient.signPdf`. */
export type GotenbergSigningCertificate =
	| {
			kind: 'pkcs12';
			/** PKCS#12 (`.p12`/`.pfx`) contents. */
			data: GotenbergBinary;
			/** Filename uploaded to Gotenberg, e.g. `issuer.p12`. */
			filename: string;
			/** Password that opens the PKCS#12 file. */
			password?: string;
	  }
	| {
			kind: 'pem';
			/** PEM certificate contents and its uploaded filename. */
			certificate: GotenbergFile;
			/** PEM private key contents and its uploaded filename. */
			key: GotenbergFile;
	  };

/** Options for `GotenbergClient.signPdf` (`POST /forms/pdf/sign`). */
export type SignPdfOptions = {
	certificate: GotenbergSigningCertificate;
	/** PAdES signature, the format eIDAS recognizes (default `false`). */
	pades?: boolean;
	/** Why the PDF is signed; shown in the viewer's signature panel. */
	reason?: string;
	/** Where it is signed; shown in the viewer's signature panel. */
	location?: string;
	/** How to reach the signer; shown in the viewer's signature panel. */
	contactInfo?: string;
	/** The signer's name; shown in the viewer's signature panel. */
	name?: string;
	/** RFC 3161 timestamp authority URL used to timestamp the signature. */
	timestampUrl?: string;
	/** Filename sent for the PDF (default `document.pdf`). */
	filename?: string;
	headers?: Record<string, string>;
	/** Per-request timeout in milliseconds. */
	timeoutMs?: number;
};

/** Options for `GotenbergClient.timestampPdf` (`POST /forms/pdf/timestamp`). */
export type TimestampPdfOptions = {
	/** RFC 3161 timestamp authority URL. */
	timestampUrl: string;
	/** Filename sent for the PDF (default `document.pdf`). */
	filename?: string;
	headers?: Record<string, string>;
	/** Per-request timeout in milliseconds. */
	timeoutMs?: number;
};

/** Options for `GotenbergClient.pdfInfo` (`POST /forms/pdf/info`). */
export type PdfInfoOptions = {
	/** Filename sent for the PDF (default `document.pdf`). */
	filename?: string;
	/** Opens encrypted PDFs. */
	password?: string;
	headers?: Record<string, string>;
	/** Per-request timeout in milliseconds. */
	timeoutMs?: number;
};

/** The subset of `/forms/pdf/info` this client returns. */
export type GotenbergPdfInfo = {
	pages: number;
	version: string;
	encrypted: boolean;
	tagged: boolean;
	linearized: boolean;
	formFields: boolean;
	/** Whether the PDF carries a signature; Gotenberg does not validate it. */
	signed: boolean;
};

/** A scalar or repeated form field understood by a Gotenberg route. */
export type GotenbergFieldValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| readonly (string | number | boolean)[];

/**
 * Route-specific parameters. Gotenberg reads files from the `files` form
 * field, route options from `fields`, and service options from HTTP headers
 * (`Gotenberg-Output-Filename`, `Gotenberg-Webhook-Url`, …).
 */
export type GotenbergRequest = {
	files?: readonly GotenbergFile[];
	fields?: Record<string, GotenbergFieldValue>;
	headers?: Record<string, string>;
	/** Per-request timeout in milliseconds. */
	timeoutMs?: number;
};

export type GotenbergClientOptions = {
	/** Base URL of a Gotenberg instance, e.g. `http://gotenberg:3000`. */
	url: string;
	/** Default request timeout in milliseconds (default 60s). */
	timeoutMs?: number;
	/** Headers sent with every request, e.g. authorization. */
	headers?: Record<string, string>;
};

/** A non-2xx response from Gotenberg. */
export class GotenbergError extends Error {
	readonly route: string;
	readonly status: number;
	readonly detail: string;

	constructor(route: string, status: number, detail: string) {
		super(`Gotenberg request to ${route} failed (${status})${detail ? `: ${detail}` : ''}`);
		this.name = 'GotenbergError';
		this.route = route;
		this.status = status;
		this.detail = detail;
	}
}

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Standard client for Gotenberg's multipart HTTP API.
 *
 * One instance owns the base URL, default headers and timeout; every call
 * serializes files and route parameters the same way. Use `request` for a
 * binary result or `post` when the raw response matters (webhooks, 204s).
 */
export class GotenbergClient {
	readonly #url: string;
	readonly #timeoutMs: number;
	readonly #headers: Record<string, string>;

	constructor({ url, timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} }: GotenbergClientOptions) {
		const baseUrl = url.trim().replace(/\/+$/, '');
		if (!baseUrl) throw new Error('GotenbergClient: url is required');

		this.#url = baseUrl;
		this.#timeoutMs = timeoutMs;
		this.#headers = headers;
	}

	/** Base URL without a trailing slash. */
	get url(): string {
		return this.#url;
	}

	/** POSTs a multipart request and returns the raw successful response. */
	async post(route: string, request: GotenbergRequest = {}): Promise<Response> {
		const path = this.#path(route);
		const form = new FormData();

		for (const file of request.files ?? []) {
			form.append('files', fileBlob(file), file.filename);
		}

		for (const [name, value] of Object.entries(request.fields ?? {})) {
			if (value === null || value === undefined) continue;
			if (Array.isArray(value)) {
				for (const item of value) form.append(name, String(item));
			} else {
				form.append(name, String(value));
			}
		}

		const response = await fetch(`${this.#url}${path}`, {
			method: 'POST',
			body: form,
			headers: { ...this.#headers, ...request.headers },
			signal: AbortSignal.timeout(request.timeoutMs ?? this.#timeoutMs)
		});

		if (!response.ok) {
			const detail = await response.text().catch(() => '');
			throw new GotenbergError(path, response.status, detail.slice(0, 500));
		}

		return response;
	}

	/** POSTs a multipart request and returns the response bytes. */
	async request(route: string, request: GotenbergRequest = {}): Promise<Buffer> {
		const response = await this.post(route, request);
		return Buffer.from(await response.arrayBuffer());
	}

	/**
	 * Merges PDFs through `/forms/pdf/merge` (Gotenberg 9+).
	 *
	 * Files are named `0000.pdf`, `0001.pdf`, … because Gotenberg combines
	 * inputs in alphanumeric filename order, not upload order.
	 */
	async mergePdfs(
		pdfs: readonly Uint8Array[],
		request: Omit<GotenbergRequest, 'files'> = {}
	): Promise<Buffer> {
		if (pdfs.length === 0) {
			throw new Error('mergePdfs: at least one PDF is required');
		}
		if (pdfs.length === 1) {
			return Buffer.from(pdfs[0]);
		}

		return this.request('/forms/pdf/merge', {
			...request,
			files: pdfs.map((data, index) => ({
				data,
				filename: `${String(index).padStart(4, '0')}.pdf`,
				contentType: 'application/pdf'
			}))
		});
	}

	/**
	 * Signs a PDF through `/forms/pdf/sign` (Gotenberg 9+).
	 *
	 * The signature covers the bytes sent, so finish merging, flattening and
	 * stamping first: any later rewrite invalidates it. Use a certificate the
	 * recipient trusts and `pades: true` for eIDAS-compatible signatures.
	 */
	async signPdf(pdf: GotenbergBinary, options: SignPdfOptions): Promise<Buffer> {
		const files: GotenbergFile[] = [
			{
				data: pdf,
				filename: options.filename ?? 'document.pdf',
				contentType: 'application/pdf'
			}
		];
		const fields: Record<string, GotenbergFieldValue> = {};

		if (options.certificate.kind === 'pkcs12') {
			files.push({
				data: options.certificate.data,
				filename: options.certificate.filename
			});
			fields.certificate = options.certificate.filename;
			if (options.certificate.password !== undefined) {
				fields.certificatePassword = options.certificate.password;
			}
		} else {
			files.push(options.certificate.certificate, options.certificate.key);
			fields.certificate = options.certificate.certificate.filename;
			fields.key = options.certificate.key.filename;
		}

		if (options.pades !== undefined) fields.pades = options.pades;
		if (options.reason !== undefined) fields.reason = options.reason;
		if (options.location !== undefined) fields.location = options.location;
		if (options.contactInfo !== undefined) fields.contactInfo = options.contactInfo;
		if (options.name !== undefined) fields.name = options.name;
		if (options.timestampUrl !== undefined) fields.timestampUrl = options.timestampUrl;

		return this.request('/forms/pdf/sign', {
			files,
			fields,
			headers: options.headers,
			timeoutMs: options.timeoutMs
		});
	}

	/**
	 * Adds an RFC 3161 document timestamp through `/forms/pdf/timestamp`
	 * (Gotenberg 9+): proof the PDF existed, unchanged, at that time.
	 */
	async timestampPdf(pdf: GotenbergBinary, options: TimestampPdfOptions): Promise<Buffer> {
		return this.request('/forms/pdf/timestamp', {
			files: [
				{
					data: pdf,
					filename: options.filename ?? 'document.pdf',
					contentType: 'application/pdf'
				}
			],
			fields: { timestampUrl: options.timestampUrl },
			headers: options.headers,
			timeoutMs: options.timeoutMs
		});
	}

	/**
	 * Reads `/forms/pdf/info` (Gotenberg 9+). `signed` only reports whether a
	 * signature is present — Gotenberg does not verify it.
	 */
	async pdfInfo(pdf: GotenbergBinary, options: PdfInfoOptions = {}): Promise<GotenbergPdfInfo> {
		const filename = options.filename ?? 'document.pdf';
		const response = await this.post('/forms/pdf/info', {
			files: [{ data: pdf, filename, contentType: 'application/pdf' }],
			fields: options.password === undefined ? undefined : { password: options.password },
			headers: options.headers,
			timeoutMs: options.timeoutMs
		});

		const result = (await response.json()) as Record<string, GotenbergPdfInfo>;
		const info = result[filename];
		if (!info) {
			throw new Error(`Gotenberg did not return info for ${filename}`);
		}
		return info;
	}

	#path(route: string): string {
		return `/${route.replace(/^\/+/, '')}`;
	}
}

function fileBlob(file: GotenbergFile): Blob {
	if (file.data instanceof Blob && !file.contentType) return file.data;

	return new Blob([file.data], {
		type: file.contentType ?? 'application/octet-stream'
	});
}
