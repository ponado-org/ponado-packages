export type PdfMergeOptions = {
	/** Base URL of a Gotenberg instance, e.g. `http://gotenberg:3000`. */
	url: string;
	/** Request timeout in milliseconds (default 60s). */
	timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Merges PDFs through a Gotenberg instance.
 *
 * This is the lightweight default: no PDF engine is bundled. The service owns
 * the merge and the app only ships a fetch call. Use `@ponado-org/documents/pdf-local`
 * when no Gotenberg sidecar is available.
 *
 * Files are named `0000.pdf`, `0001.pdf`, … because Gotenberg combines inputs
 * in alphanumeric filename order, not upload order.
 */
export async function mergePdfs(
	pdfs: readonly Uint8Array[],
	{ url, timeoutMs = DEFAULT_TIMEOUT_MS }: PdfMergeOptions
): Promise<Buffer> {
	if (pdfs.length === 0) {
		throw new Error('mergePdfs: at least one PDF is required');
	}
	if (pdfs.length === 1) {
		return Buffer.from(pdfs[0]);
	}

	const form = new FormData();
	pdfs.forEach((pdf, index) => {
		const name = `${String(index).padStart(4, '0')}.pdf`;
		form.append('files', new Blob([pdf], { type: 'application/pdf' }), name);
	});

	const response = await fetch(`${url.replace(/\/+$/, '')}/forms/pdfengines/merge`, {
		method: 'POST',
		body: form,
		signal: AbortSignal.timeout(timeoutMs)
	});

	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		throw new Error(`Gotenberg merge failed (${response.status}): ${detail.slice(0, 500)}`);
	}

	return Buffer.from(await response.arrayBuffer());
}
