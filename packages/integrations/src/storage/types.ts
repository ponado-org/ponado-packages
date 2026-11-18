/**
 * Provider-agnostic file storage contract.
 *
 * A backend owns bytes; callers own policy (auth, database rows, key naming).
 * `open()` keeps the delivery decision in the backend: object stores can
 * redirect to a presigned URL, while filesystem storage streams from disk.
 */

export type StorageProvider = string;

export interface PutInput {
	/** Object key, relative to the backend root. Must not escape it. */
	key: string;
	body: Buffer;
	contentType: string;
}

export interface StorageOpenOptions {
	/** Original filename, used for the Content-Disposition header. */
	filename?: string;
	/** Force a download instead of inline display. */
	download?: boolean;
	/** Signed URL lifetime in seconds (object stores only). */
	expiresIn?: number;
	/** Raw `Range` request header. Backends that can serve partial content honor it. */
	range?: string | null;
}

/** Byte range of a partial (206) response. `end` is inclusive. */
export interface ServedRange {
	start: number;
	end: number;
	total: number;
}

/**
 * How an object can be delivered without loading it into the app process.
 *
 * - `redirect`: the browser fetches the bytes straight from the backend
 *   (presigned S3).
 * - `stream`: the bytes are piped from the backend to the response (local
 *   disk). `size` is the length of this response, `total` the full object.
 * - `rangeNotSatisfiable`: the requested `Range` does not overlap the object.
 */
export type StorageReadResult =
	| { kind: 'redirect'; url: string }
	| {
			kind: 'stream';
			stream: ReadableStream<Uint8Array>;
			size: number;
			total: number;
			range?: ServedRange;
	  }
	| { kind: 'rangeNotSatisfiable'; total: number };

/** An object discovered by `StorageBackend.list()`. */
export interface StorageObjectInfo {
	key: string;
	lastModified?: Date;
	size?: number;
}

export interface StorageListOptions {
	/** Only return keys that start with this prefix. */
	prefix?: string;
}

export interface StorageBackend<TProvider extends StorageProvider = StorageProvider> {
	readonly provider: TProvider;

	/** Prepare the backend for writes (create the directory or bucket). */
	init(): Promise<void>;

	/** Lightweight reachability/writability probe for startup checks. */
	check(): Promise<void>;

	put(input: PutInput): Promise<{ key: string }>;

	/**
	 * Read the whole object into memory.
	 *
	 * Internal jobs only (backup, restore). Request handlers must use `open()`
	 * so serving a download never buffers the object in the app process.
	 */
	get(key: string): Promise<Buffer | null>;

	/** Delete an object. Missing objects are not an error. */
	delete(key: string): Promise<void>;

	/**
	 * Delete many objects. Missing objects are not an error. Must throw when
	 * any key was not deleted, so callers can keep their database rows.
	 */
	deleteMany(keys: string[]): Promise<void>;

	/** List every object (optionally under a prefix). */
	list(options?: StorageListOptions): Promise<StorageObjectInfo[]>;

	/**
	 * Resolve an object for delivery: a presigned redirect or a disk-backed
	 * stream, never a buffered body. Returns null when the object is missing.
	 */
	open(key: string, opts?: StorageOpenOptions): Promise<StorageReadResult | null>;
}
