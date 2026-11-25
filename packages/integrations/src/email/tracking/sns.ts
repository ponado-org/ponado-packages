import { createPublicKey, verify as verifySignature, type KeyObject } from 'node:crypto';
import type { SnsCanonicalFields } from './schemas.js';

const SNS_CANONICAL_NAMES = [
	'Message',
	'MessageId',
	'Subject',
	'SubscribeURL',
	'Timestamp',
	'Token',
	'TopicArn',
	'Type'
] as const;

/**
 * SNS signs a fixed-order canonical string. It is not alphabetical and does
 * NOT include SignatureVersion or SigningCertURL.
 * https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 */
export function snsCanonicalString(notification: SnsCanonicalFields): string {
	return SNS_CANONICAL_NAMES.filter((name) => notification[name] !== undefined)
		.map((name) => `${name}\n${String(notification[name])}\n`)
		.join('');
}

const DEFAULT_ALLOWED_HOSTS = [
	/^sns(\.[a-z0-9-]+)*\.amazonaws\.com$/i,
	/^sns(\.[a-z0-9-]+)*\.amazonaws\.com\.cn$/i
];

export type SnsVerifierOptions = {
	/** Injected for tests; defaults to global fetch. */
	fetch?: typeof fetch;
	/** Injected key loader for tests; defaults to fetching the SNS certificate. */
	getPublicKey?: (certificateUrl: URL) => Promise<KeyObject | string>;
	/** Override the SNS host allowlist (rarely needed). */
	allowedHosts?: RegExp[];
	/** Maximum cached signing keys (default 20). */
	maxCacheEntries?: number;
};

export type SnsVerifier = {
	verify(notification: SnsCanonicalFields): Promise<boolean>;
	/** True for an https URL on an allowed SNS host. */
	isSnsUrl(value: string): boolean;
};

/**
 * Verifies SNS signatures and guards the certificate/subscription URLs against
 * SSRF. Signing certificates are immutable once published, so a small
 * per-process cache avoids a network round-trip per webhook call.
 */
export function createSnsVerifier(options: SnsVerifierOptions = {}): SnsVerifier {
	const cache = new Map<string, KeyObject>();
	const maxCacheEntries = options.maxCacheEntries ?? 20;
	const fetchImpl = options.fetch ?? globalThis.fetch;
	const allowedHosts = options.allowedHosts ?? DEFAULT_ALLOWED_HOSTS;

	const isSnsUrl = (value: string): boolean => {
		try {
			const url = new URL(value);
			return (
				url.protocol === 'https:' &&
				allowedHosts.some((pattern) => pattern.test(url.hostname))
			);
		} catch {
			return false;
		}
	};

	const getPublicKey = async (certificateUrl: URL): Promise<KeyObject> => {
		const cacheKey = certificateUrl.toString();
		const cached = cache.get(cacheKey);
		if (cached) return cached;

		let publicKey: KeyObject | string;
		if (options.getPublicKey) {
			publicKey = await options.getPublicKey(certificateUrl);
		} else {
			const response = await fetchImpl(certificateUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch SNS signing certificate: ${response.status}`);
			}
			publicKey = await response.text();
		}

		const key = typeof publicKey === 'string' ? createPublicKey(publicKey) : publicKey;
		if (cache.size >= maxCacheEntries) {
			const oldest = cache.keys().next().value;
			if (oldest) cache.delete(oldest);
		}
		cache.set(cacheKey, key);
		return key;
	};

	const verify = async (notification: SnsCanonicalFields): Promise<boolean> => {
		if (
			!notification.Signature ||
			!notification.SignatureVersion ||
			!notification.SigningCertURL
		) {
			return false;
		}
		if (!isSnsUrl(notification.SigningCertURL)) return false;

		try {
			const publicKey = await getPublicKey(new URL(notification.SigningCertURL));
			const algorithm = notification.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1';
			return verifySignature(
				algorithm,
				Buffer.from(snsCanonicalString(notification)),
				publicKey,
				Buffer.from(notification.Signature, 'base64')
			);
		} catch {
			return false;
		}
	};

	return { verify, isSnsUrl };
}
