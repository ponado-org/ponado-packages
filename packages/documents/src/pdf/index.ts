import { GotenbergClient, type GotenbergClientOptions } from './gotenberg.js';

export { GotenbergClient, GotenbergError } from './gotenberg.js';
export type {
	GotenbergBinary,
	GotenbergClientOptions,
	GotenbergFieldValue,
	GotenbergFile,
	GotenbergPdfInfo,
	GotenbergRequest,
	GotenbergSigningCertificate,
	PdfInfoOptions,
	SignPdfOptions,
	TimestampPdfOptions
} from './gotenberg.js';

export type PdfMergeOptions = GotenbergClientOptions;

/**
 * Merges PDFs through a Gotenberg 9 instance.
 *
 * Standalone convenience wrapper around `GotenbergClient.mergePdfs`. Create a
 * client once when several operations share a URL or headers; use this helper
 * for a one-off merge.
 *
 * A single input is returned as-is without a request. Multiple inputs are
 * named `0000.pdf`, `0001.pdf`, … because Gotenberg combines inputs in
 * alphanumeric filename order, not upload order.
 */
export async function mergePdfs(
	pdfs: readonly Uint8Array[],
	options: PdfMergeOptions
): Promise<Buffer> {
	return new GotenbergClient(options).mergePdfs(pdfs);
}
