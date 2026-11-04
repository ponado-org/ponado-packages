import type { PutInput, StorageBackend, StorageOpenOptions, StorageReadResult } from './types.js';

export type S3ObjectResult = { ok: true; objectBuffer: Buffer } | { ok: false; error: string };

export type S3SignedUrlResult =
	| { signedUrl: string; expiresAt: number; error?: null }
	| { signedUrl: null; expiresAt: null; error: string };

/**
 * The slice of an S3 client the backend needs. Structurally compatible with
 * `createS3Client` from `@ponado/s3` and with app-local wrappers, so this
 * package carries no AWS SDK dependency.
 */
export interface S3StorageClient {
	putObject(input: {
		key: string;
		file: Buffer;
		contentType: string;
		bucket?: string;
	}): Promise<{ key: string }>;
	getObject(input: { key: string; bucket?: string }): Promise<S3ObjectResult>;
	deleteObject(input: { key: string; bucket?: string }): Promise<string | null>;
	getSignedUrl(input: {
		key: string;
		bucket?: string;
		filename?: string;
		download?: boolean;
		expirityTime?: number;
	}): Promise<S3SignedUrlResult>;
	bucketExists?(input?: { bucket?: string }): Promise<boolean>;
	createBucket?(input: { name: string }): Promise<unknown>;
}

export interface CreateS3BackendOptions {
	client: S3StorageClient;
	/** Bucket override. When omitted the client's default bucket is used. */
	bucket?: string;
	/** Create the bucket on init when it does not exist. Default false. */
	ensureBucket?: boolean;
	/**
	 * Reachability/credentials probe for startup checks. Defaults to
	 * `bucketExists` when a bucket is configured.
	 */
	check?: () => Promise<void>;
}

/** S3-compatible object storage over an injected client. */
export function createS3Backend({
	client,
	bucket,
	ensureBucket = false,
	check
}: CreateS3BackendOptions): StorageBackend<'s3'> {
	return {
		provider: 's3',

		async init() {
			if (!ensureBucket) return;
			if (!bucket) {
				throw new Error('storage: bucket is required when ensureBucket is enabled');
			}
			if (!client.bucketExists || !client.createBucket) {
				throw new Error(
					'storage: ensureBucket requires bucketExists and createBucket on the S3 client'
				);
			}
			if (await client.bucketExists({ bucket })) return;

			await client.createBucket({ name: bucket });
			if (!(await client.bucketExists({ bucket }))) {
				throw new Error(`storage: S3 bucket ${bucket} could not be created`);
			}
		},

		async check() {
			if (check) return check();
			if (client.bucketExists && bucket) {
				await client.bucketExists({ bucket });
				return;
			}
			throw new Error(
				'storage: S3 check requires a check callback or a bucket with bucketExists'
			);
		},

		async put({ key, body, contentType }: PutInput) {
			await client.putObject({ key, file: body, contentType, bucket });
			return { key };
		},

		async get(key: string): Promise<Buffer | null> {
			const result = await client.getObject({ key, bucket });
			return result.ok ? result.objectBuffer : null;
		},

		async delete(key: string): Promise<void> {
			const error = await client.deleteObject({ key, bucket });
			if (error) throw new Error(error);
		},

		async open(key: string, opts?: StorageOpenOptions): Promise<StorageReadResult | null> {
			const result = await client.getSignedUrl({
				key,
				bucket,
				filename: opts?.filename,
				download: opts?.download,
				expirityTime: opts?.expiresIn
			});
			if (result.error || !result.signedUrl) {
				throw new Error(result.error ?? 'S3 signing failed');
			}
			return { kind: 'redirect', url: result.signedUrl };
		}
	};
}
