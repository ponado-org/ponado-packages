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

	const fileType = await fileTypeFromBuffer(buffer);

	if (!fileType) {
		// Additional fallback checks for other text-based formats if needed
		const text = buffer.toString('utf8', 0, Math.min(500, buffer.length));

		if (text.includes('<?xml')) {
			return {
				ext: 'xml',
				mime: 'application/xml'
			};
		}

		return null; // Unknown format
	}

	return fileType;
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

export const createS3Client = (config: ClientProps) => {

	const s3 = new S3Client(config);

	async function deleteObject(key: string): Promise<string | null> {
		try {
			await s3.send(new DeleteObjectCommand({ Bucket: config.defaultBucket, Key: key }));
			return null; // success, no error
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
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

	type SaveProps = { file: Buffer | ArrayBuffer | File };



	async function uploadObject({ file }: SaveProps) {
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

			let fileId = createId()
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
		uploadObject,
		deleteObject,
		deleteObjects,
		getSignedUrl,
		saveOrReplaceObject,
		getObject,
	};

};
