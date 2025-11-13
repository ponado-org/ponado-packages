import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	DeleteObjectsCommand,
	ListBucketsCommand,
	CreateBucketCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl as getSignedUrlAWS } from '@aws-sdk/s3-request-presigner';
import { fileTypeFromBuffer } from 'file-type';
import { Readable } from 'node:stream';

const DEFAULT_SIGNED_URL_EXPIRITY = 60 * 10;

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];

	for await (const chunk of stream) {
		chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
	}

	return Buffer.concat(chunks);
}

export async function detectFileType(buffer: Buffer) {
	// FIRST: Check for binary file types using file signature
	const fileType = await fileTypeFromBuffer(buffer);

	// If file-type detects XML, check if it's actually SVG
	if (fileType && fileType.ext === 'xml') {
		const text = buffer.toString('utf8', 0, Math.min(4096, buffer.length)).trim();
		if (text.includes('<svg') || text.match(/^<svg[\s>]/i)) {
			return { ext: 'svg', mime: 'image/svg+xml' };
		}
		return fileType; // It's XML but not SVG
	}

	// Return other binary file types immediately
	if (fileType) return fileType;

	// THEN: Check if it's likely binary (high ratio of non-printable chars)
	const sample = buffer.subarray(0, Math.min(8192, buffer.length));
	const nonPrintable = sample.filter((byte) => byte < 32 && ![9, 10, 13].includes(byte)).length;
	if (nonPrintable / sample.length > 0.3) {
		return null; // Likely binary but unrecognized
	}

	// FINALLY: Check text-based formats
	const text = buffer.toString('utf8', 0, Math.min(4096, buffer.length)).trim();

	// XML/SVG (check SVG more strictly)
	if (text.startsWith('<?xml')) {
		return text.includes('<svg')
			? { ext: 'svg', mime: 'image/svg+xml' }
			: { ext: 'xml', mime: 'application/xml' };
	}
	if (text.match(/^<svg[\s>]/i)) {
		return { ext: 'svg', mime: 'image/svg+xml' };
	}

	// HTML
	if (text.match(/^<!DOCTYPE html/i) || text.match(/^<html[\s>]/i)) {
		return { ext: 'html', mime: 'text/html' };
	}

	// JSON (be more careful)
	if (
		(text.startsWith('{') && text.includes('}')) ||
		(text.startsWith('[') && text.includes(']'))
	) {
		try {
			JSON.parse(text);
			return { ext: 'json', mime: 'application/json' };
		} catch {
			// Not valid JSON, continue
		}
	}

	// YAML
	if (text.match(/^---\n/) || text.match(/^\w+:\s*[\w[{]/m)) {
		return { ext: 'yaml', mime: 'text/yaml' };
	}

	// CSV (improved heuristic)
	const lines = text.split('\n').filter((l) => l.trim());
	if (lines.length > 2) {
		const colCounts = lines.slice(0, 10).map((l) => l.split(',').length);
		const consistent = colCounts.every((c) => c === colCounts[0] && c > 1);
		if (consistent) {
			return { ext: 'csv', mime: 'text/csv' };
		}
	}

	// Code files
	if (text.includes('function ') || text.includes('const ') || text.includes('=>')) {
		if (text.includes('import ') || text.includes('export ')) {
			return { ext: 'js', mime: 'application/javascript' };
		}
	}

	// Markdown (broader check)
	if (text.match(/^#{1,6}\s+\w/) || text.includes('```') || text.match(/\[.+\]\(.+\)/)) {
		return { ext: 'md', mime: 'text/markdown' };
	}

	// Plain text fallback (less restrictive)
	if (text.length > 0) {
		return { ext: 'txt', mime: 'text/plain' };
	}

	return null;
}

export type FetchObjectResult =
	| {
			ok: false;
			error: string;
			// objectBuffer: null
	  }
	| {
			ok: true;
			objectBuffer: Buffer;
	  };

export type SignedUrlResult =
	| {
			signedUrl: string;
			expiresAt: number;
			error?: null;
	  }
	| {
			signedUrl: null;
			expiresAt: null;
			error: string;
	  };

type ClientProps = {
	region: string;
	endpoint: string;
	defaultBucket: string;
	credentials: {
		accessKeyId: string;
		secretAccessKey: string;
	};
	forcePathStyle: boolean;
};

import { ListObjectsV2Command, CopyObjectCommand } from '@aws-sdk/client-s3';

export const createS3Client = (config: ClientProps) => {
	const s3 = new S3Client(config);

	async function cloneBucket({
		sourceBucket,
		targetBucket,
		fromPrefix,
		toPrefix,
		keepStructure = true
	}: {
		sourceBucket: string;
		targetBucket: string;
		fromPrefix?: string;
		toPrefix?: string;
		keepStructure?: boolean;
		region?: string;
	}) {
		let continuationToken: string | undefined;

		do {
			const listResponse = await s3.send(
				new ListObjectsV2Command({
					Bucket: sourceBucket,
					Prefix: fromPrefix,
					ContinuationToken: continuationToken
				})
			);

			const contents = listResponse.Contents ?? [];

			for (const obj of contents) {
				if (!obj.Key) continue;

				let newKey = keepStructure ? obj.Key : obj.Key.split('/').pop()!;
				if (toPrefix) newKey = `${toPrefix.replace(/\/$/, '')}/${newKey}`;

				console.log(`Copying ${obj.Key} → ${newKey}`);

				await s3.send(
					new CopyObjectCommand({
						Bucket: targetBucket,
						CopySource: `${sourceBucket}/${obj.Key}`,
						Key: newKey
					})
				);
			}

			continuationToken = listResponse.NextContinuationToken;
		} while (continuationToken);
	}

	/** Allow sending any AWS command directly */
	async function send<T>(command: T): Promise<unknown> {
		// this keeps full typing if you pass a proper Command
		// e.g. s3Client.send(new ListBucketsCommand())
		// or s3Client.send(new GetObjectCommand({ Bucket, Key }))
		// It’s effectively a type-safe passthrough.
		// @ts-expect-error: allow generic commands
		return s3.send(command);
	}

	async function deleteObject({
		key,
		bucket = config.defaultBucket
	}: {
		key: string;
		bucket?: string;
	}): Promise<string | null> {
		if (!bucket) {
			throw new Error(
				'Missing please provide bucket, or set default bucket on global instanstance'
			);
		}

		try {
			await s3.send(
				new DeleteObjectCommand({
					Bucket: bucket,
					Key: key
				})
			);
			return null;
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
	}

	async function deleteObjectByPrefix({
		keyOrPrefix,
		bucket = config.defaultBucket
	}: {
		keyOrPrefix: string;
		bucket?: string;
	}): Promise<{ deleted: string[]; error?: string }> {
		if (!bucket) {
			throw new Error(
				'Missing please provide bucket, or set default bucket on global instanstance'
			);
		}

		try {
			// List all objects matching the prefix
			const listResult = await s3.send(
				new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: keyOrPrefix
				})
			);

			const objectsToDelete = listResult.Contents?.map((obj) => ({ Key: obj.Key! })) || [];

			if (objectsToDelete.length === 0) {
				return { deleted: [] }; // nothing to delete
			}

			const deleteResult = await s3.send(
				new DeleteObjectsCommand({
					Bucket: config.defaultBucket,
					Delete: { Objects: objectsToDelete }
				})
			);

			const deletedKeys = deleteResult.Deleted?.map((d) => d.Key!) || [];
			return { deleted: deletedKeys };
		} catch (error) {
			return {
				deleted: [],
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	async function deleteObjects({
		bucket = config.defaultBucket,
		keys
	}: {
		keys: string[];
		bucket?: string;
	}): Promise<string | null> {
		if (!bucket) {
			throw new Error(
				'Missing please provide bucket, or set default bucket on global instanstance'
			);
		}

		try {
			await s3.send(
				new DeleteObjectsCommand({
					Bucket: bucket,
					Delete: {
						Objects: keys.map((Key) => ({ Key })),
						Quiet: false
					}
				})
			);
			return null; // success, no error
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
	}

	async function getSignedUrl({
		key,
		bucket = config.defaultBucket,
		expirityTime
	}: {
		key: string;
		bucket?: string;
		expirityTime?: number;
	}): Promise<SignedUrlResult> {
		if (!bucket) {
			throw new Error(
				'Missing please provide bucket, or set default bucket on global instanstance'
			);
		}

		try {
			const command = new GetObjectCommand({ Bucket: bucket, Key: key });
			const expireIn = expirityTime ?? DEFAULT_SIGNED_URL_EXPIRITY;
			const signedUrl = await getSignedUrlAWS(s3, command, {
				expiresIn: expireIn
			});
			return {
				signedUrl,
				expiresAt: Date.now() + expireIn * 1000,
				error: null
			};
		} catch (error) {
			return {
				signedUrl: null,
				expiresAt: null,
				error: error instanceof Error ? error.message : 'unknown error'
			};
		}
	}

	async function getObject({
		key,
		bucket = config.defaultBucket
	}: {
		key: string;
		bucket?: string;
	}): Promise<FetchObjectResult> {
		if (!bucket) {
			throw new Error(
				'Missing please provide bucket, or set default bucket on global instanstance'
			);
		}

		try {
			const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
			if (!(Body instanceof Readable))
				return { ok: false, error: 'Invalid stream returned.' };
			return { ok: true, objectBuffer: await streamToBuffer(Body) };
		} catch (err) {
			return {
				ok: false,
				error: `Failed to get object: ${err instanceof Error ? err.message : 'unknown error'}`
			};
		}
	}

	async function uploadObject({
		file,
		fileId,
		bucket = config.defaultBucket
	}: {
		file: Buffer | Blob | ArrayBuffer | File;
		fileId: string;
		bucket?: string;
	}) {
		if (!bucket) {
			throw new Error(
				'Missing please provide bucket, or set default bucket on global instanstance'
			);
		}

		try {
			let fileBuffer: Buffer;

			// Normalize input to Buffer
			if (file instanceof Buffer) {
				fileBuffer = file;
			} else if (file instanceof ArrayBuffer) {
				fileBuffer = Buffer.from(file);
			} else if (file instanceof Blob) {
				fileBuffer = Buffer.from(await file.arrayBuffer());
			} else {
				throw new Error('Unsupported file type');
			}

			const fileTypeResult = await detectFileType(fileBuffer);

			if (!fileTypeResult) {
				throw new Error('Could not determine file type from buffer.');
			}

			const key = `${fileId}.${fileTypeResult.ext}`;

			await s3.send(
				new PutObjectCommand({
					Bucket: bucket,
					Key: key,
					Body: fileBuffer,
					ContentType: fileTypeResult.mime
				})
			);

			return {
				extension: fileTypeResult.ext,
				mimeType: fileTypeResult.mime,
				fileId,
				key
			};
		} catch (err) {
			throw new Error(`Error saving file to S3: ${err}`, { cause: err });
		}
	}

	async function createBucket(props: { name: string }) {
		try {
			const command = new CreateBucketCommand({
				Bucket: props.name
			});

			const response = await s3.send(command);
			console.log(`Bucket created: ${props.name}`);
			console.log('Location:', response.Location);

			return response;
		} catch (error) {
			console.error('Error:', error);
			return [];
		}
	}
	async function listBuckets() {
		try {
			const command = new ListBucketsCommand({});
			const response = await s3.send(command);

			const bucketList = (response.Buckets ?? [])
				.filter((bucket): bucket is { Name: string } => !!bucket.Name)
				.map((bucket) => bucket.Name);

			return bucketList;
		} catch (error) {
			console.error('Error:', error);
			return [];
		}
	}

	type SaveReplaceProps = {
		file: Buffer | ArrayBuffer | File;
		fileId: string;
		key?: string;
		bucket?: string;
	};

	async function saveOrReplaceObject({
		file,
		key,
		fileId,
		bucket = config.defaultBucket
	}: SaveReplaceProps) {
		if (!bucket) {
			throw new Error(
				'Missing please provide bucket, or set default bucket on global instanstance'
			);
		}

		// remove existing file if there is one
		if (key) {
			try {
				await deleteObject({ key });
			} catch (err) {
				console.error('Failed to delete old file:', err);
			}
		}

		// upload the new one
		const fileResult = await uploadObject({ file, fileId });

		if (!fileResult.fileId) throw new Error('File upload failed');

		return fileResult;
	}

	return {
		send,
		listBuckets,
		createBucket,
		cloneBucket,
		uploadObject,
		deleteObject,
		deleteObjects,
		getSignedUrl,
		saveOrReplaceObject,
		getObject,
		deleteObjectByPrefix
	};
};
