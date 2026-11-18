import { escapeRegexLiteral, substituteTemplate } from '../shared/index.js';
import { createPlaceholderRegex } from '../shared/utils.js';

/**
 * Typst -> PDF rendering is delegated to the shared ponado-typst service
 * (Gotenberg-style HTTP sidecar that owns the typst engine). Set TYPST_URL in
 * the server environment - e.g. http://ponado-typst:3100 on the shared docker
 * network.
 *
 * Keeping the engine out of this package is the point: importing
 * `@ponado-org/documents/typst` must not pull
 * `@myriaddreamin/typst-ts-node-compiler` into app bundles anymore.
 */

const DEFAULT_TIMEOUT_MS = 30_000;

function typstServiceUrl(): string {
	const url = process.env.TYPST_URL;
	if (!url) {
		throw new Error(
			'Typst rendering requires TYPST_URL - point it at the ponado-typst service (e.g. http://ponado-typst:3100)'
		);
	}
	return url.replace(/\/+$/, '');
}

export function escapeTypstString(str: string): string {
	if (!str) return '';
	return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '').replace(/\n/g, ' ');
}

export async function renderTypstTemplateWithData<T>(params: { data: T; template: string }) {
	const jsonString = JSON.stringify(params.data);
	const utf8Buffer = Buffer.from(jsonString, 'utf-8');
	const byteArrayString = Array.from(utf8Buffer).join(', ');

	const compiledTemplate = substituteTemplate({
		template: params.template,
		substitutions: {
			inputData: byteArrayString
		}
	});

	return convertTypstToPdf(compiledTemplate);
}

/**
 * Renders a typst template to a pdf buffer via the shared ponado-typst
 * service (`POST /render`). Requests go out as multipart/form-data, so binary
 * payloads never pay base64 overhead; fonts come from the service pool.
 */
export async function convertTypstToPdf(
	template: string,
	opts?: { inputs?: Record<string, string>; timeoutMs?: number }
): Promise<Buffer> {
	const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	const form = new FormData();
	form.append('template', template);
	form.append('timeoutMs', String(timeoutMs));
	if (opts?.inputs) form.append('inputs', JSON.stringify(opts.inputs));

	const res = await fetch(`${typstServiceUrl()}/render`, {
		method: 'POST',
		body: form,
		signal: AbortSignal.timeout(timeoutMs + 5_000)
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new Error(`typst render failed (${res.status}): ${detail.slice(0, 500)}`);
	}
	return Buffer.from(await res.arrayBuffer());
}

export function substituteTypstTemplate({
	template,
	substitutions,
	escapeRegex = true
}: {
	template: string;
	substitutions: Record<string, string>;
	escapeRegex?: boolean;
}) {
	if (!substitutions || Object.keys(substitutions).length === 0) return template;
	const keys = Object.keys(substitutions);
	const pattern = keys.map((k) => (escapeRegex ? escapeRegexLiteral(k) : k)).join('|');

	// Use string constructor, not template literal
	// Add 'u' flag for Unicode support (Lithuanian characters)
	// const regex = new RegExp(`\\{\\{\\s*(${pattern})\\s*\\}\\}`, 'gu');
	const regex = createPlaceholderRegex({ pattern });

	return template.replace(regex, (_, capturedKey) => {
		const value = substitutions[capturedKey];
		if (value === undefined) return _;
		// Convert \n to Typst line breaks
		const processed = value.replace(/\n/g, ' \\ ');
		return `${processed}`;
	});
}
