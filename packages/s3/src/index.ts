import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlAWS } from "@aws-sdk/s3-request-presigner";
import { fileTypeFromBuffer } from "file-type";
import { Readable } from "node:stream";
import { createId } from '@paralleldrive/cuid2'

const DEFAULT_SIGNED_URL_EXPIRITY = 60 * 10


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
	const sample = buffer.slice(0, Math.min(8192, buffer.length));
	const nonPrintable = sample.filter(byte => byte < 32 && ![9, 10, 13].includes(byte)).length;
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
	if ((text.startsWith('{') && text.includes('}')) ||
		(text.startsWith('[') && text.includes(']'))) {
		try {
			JSON.parse(text);
			return { ext: 'json', mime: 'application/json' };
		} catch {
			// Not valid JSON, continue
		}
	}

	// YAML
	if (text.match(/^---\n/) || text.match(/^\w+:\s*[\w\[\{]/m)) {
		return { ext: 'yaml', mime: 'text/yaml' };
	}

	// CSV (improved heuristic)
	const lines = text.split('\n').filter(l => l.trim());
	if (lines.length > 2) {
		const colCounts = lines.slice(0, 10).map(l => l.split(',').length);
		const consistent = colCounts.every(c => c === colCounts[0] && c > 1);
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

export type FetchObjectResult = {
	error: string
	// objectBuffer: null
} | {
	// error: null,
	objectBuffer: Buffer
}


type BaseProps = {
	// bucket?: string,
	key: string,
	// client: S3Client
}


export type SignedUrlResult = {
	signedUrl: string;
	expiresAt: number;
	error?: null;
} | {
	signedUrl: null;
	expiresAt: null;
	error: string;
}

type ClientProps = {
	region: string,
	endpoint: string,
	defaultBucket: string,
	credentials: {
		accessKeyId: string,
		secretAccessKey: string
	},
	forcePathStyle: boolean,

}

import {
	ListObjectsV2Command,
	CopyObjectCommand,
} from "@aws-sdk/client-s3";

export const createS3Client = (config: ClientProps) => {

	const s3 = new S3Client(config);
	async function cloneBucket({
		sourceBucket,
		targetBucket,
		fromPrefix,
		toPrefix,
		keepStructure = true,
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
					ContinuationToken: continuationToken,
				})
			);

			const contents = listResponse.Contents ?? [];

			for (const obj of contents) {
				if (!obj.Key) continue;

				let newKey = keepStructure ? obj.Key : obj.Key.split("/").pop()!;
				if (toPrefix) newKey = `${toPrefix.replace(/\/$/, "")}/${newKey}`;

				console.log(`Copying ${obj.Key} → ${newKey}`);

				await s3.send(
					new CopyObjectCommand({
						Bucket: targetBucket,
						CopySource: `${sourceBucket}/${obj.Key}`,
						Key: newKey,
					})
				);
			}

			continuationToken = listResponse.NextContinuationToken;
		} while (continuationToken);

		console.log("✅ Clone completed");
	}


	/** Allow sending any AWS command directly */
	async function send<T>(command: T): Promise<any> {
		// this keeps full typing if you pass a proper Command
		// e.g. s3Client.send(new ListBucketsCommand())
		// or s3Client.send(new GetObjectCommand({ Bucket, Key }))
		// It’s effectively a type-safe passthrough.
		// @ts-ignore: allow generic commands
		return s3.send(command);
	}


	async function deleteObject(key: string): Promise<string | null> {
		try {
			await s3.send(new DeleteObjectCommand({ Bucket: config.defaultBucket, Key: key }));
			return null; // success, no error
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
	}

	async function deleteObjectByPrefix(
		keyOrPrefix: string
	): Promise<{ deleted: string[]; error?: string }> {
		try {
			// List all objects matching the prefix
			const listResult = await s3.send(
				new ListObjectsV2Command({
					Bucket: config.defaultBucket,
					Prefix: keyOrPrefix
				})
			);

			const objectsToDelete = listResult.Contents?.map(obj => ({ Key: obj.Key! })) || [];

			if (objectsToDelete.length === 0) {
				return { deleted: [] }; // nothing to delete
			}

			const deleteResult = await s3.send(
				new DeleteObjectsCommand({
					Bucket: config.defaultBucket,
					Delete: { Objects: objectsToDelete }
				})
			);

			const deletedKeys = deleteResult.Deleted?.map(d => d.Key!) || [];
			return { deleted: deletedKeys };

		} catch (error) {
			return {
				deleted: [],
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}


	async function deleteObjects(...keys: string[]): Promise<string | null> {
		try {
			await s3.send(new DeleteObjectsCommand({
				Bucket: config.defaultBucket,
				Delete: {
					Objects: keys.map(Key => ({ Key })),
					Quiet: false
				}
			}));
			return null; // success, no error
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
	}


	async function getSignedUrl(props: BaseProps & { expirityTime?: number }): Promise<SignedUrlResult> {

		try {
			const command = new GetObjectCommand({ Bucket: config.defaultBucket, Key: props.key });
			const expireIn = props.expirityTime ?? DEFAULT_SIGNED_URL_EXPIRITY;
			const signedUrl = await getSignedUrlAWS(s3, command, {
				expiresIn: expireIn,
			});
			return {
				signedUrl,
				expiresAt: Date.now() + expireIn * 1000,
				error: null,
			};
		} catch (error: any) {

			return {
				signedUrl: null,
				expiresAt: null,
				error: error?.message ?? "unknown error",
			};
		}
	}

	async function getObject(props: BaseProps): Promise<FetchObjectResult> {
		try {
			const { Body } = await s3.send(new GetObjectCommand({ Bucket: config.defaultBucket, Key: props.key }));
			if (!(Body instanceof Readable)) return { error: 'Invalid stream returned.' };
			return { objectBuffer: await streamToBuffer(Body) };
		} catch (err: any) {
			return { error: `Failed to get object: ${err.message}` };
		}
	}


	type SaveProps = { file: Buffer | ArrayBuffer | File, fileId?: string };

	async function uploadObject({ file, fileId }: SaveProps) {
		try {
			let fileBuffer: Buffer;

			// Normalize input to Buffer
			if (file instanceof Buffer) {
				fileBuffer = file;
			} else if (file instanceof ArrayBuffer) {
				fileBuffer = Buffer.from(file);
			} else if (file instanceof File) {
				fileBuffer = Buffer.from(await file.arrayBuffer());
			} else {
				throw new Error("Unsupported file type");
			}

			const fileType = await detectFileType(fileBuffer);

			if (!fileType) {
				throw new Error("Could not determine file type from buffer.")
			}

			if (!fileId) {
				fileId = createId()
			}
			let key = `${fileId}.${fileType.ext}`

			await s3.send(
				new PutObjectCommand({
					Bucket: config.defaultBucket,
					Key: key,
					Body: fileBuffer,
					ContentType: fileType.mime,
				})
			);

			return {
				extension: fileType.ext,
				mimeType: fileType.mime,
				fileId,
				key
			};

		} catch (err) {
			throw new Error("Error saving file to S3:" + err)
		}
	}

	type SaveReplaceProps = | { file: Buffer | ArrayBuffer | File; key?: string };

	async function saveOrReplaceObject({ file, key }: SaveReplaceProps) {

		// remove existing file if there is one
		if (key) {
			try {
				await deleteObject(key);
			} catch (err) {
				console.error('Failed to delete old file:', err);
			}
		}

		// upload the new one
		const fileResult = await uploadObject({ file });

		if (!fileResult.fileId) throw new Error('File upload failed');

		return fileResult;
	}

	return {
		send,
		cloneBucket,
		uploadObject,
		deleteObject,
		deleteObjects,
		getSignedUrl,
		saveOrReplaceObject,
		getObject,
		deleteObjectByPrefix,
	};

};
