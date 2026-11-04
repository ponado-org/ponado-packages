# @ponado/storage

Provider-agnostic file storage with a local filesystem backend and an
S3-compatible backend. The package owns the bytes; your app owns policy
(auth, database rows, key naming, upload limits).

## Installation

```bash
pnpm add @ponado/storage
```

## Usage

```ts
import { createLocalBackend, createS3Backend, createStorage } from '@ponado/storage';

const storage = createStorage({
	defaultProvider: 'local',
	backends: {
		local: () => createLocalBackend('/var/lib/app/uploads'),
		s3: () =>
			createS3Backend({
				client: s3Client,
				bucket: 'uploads',
				ensureBucket: true
			})
	}
});

await storage.get().init();
await storage.get().put({ key: 'abc.txt', body, contentType: 'text/plain' });

const result = await storage.get('s3').open('abc.txt', { filename: 'abc.txt' });
// { kind: "redirect", url: "https://..." }
```

Reads should pass the provider stored with the record so files written before
a backend switch keep resolving:

```ts
const backend = storage.get(file.storageProvider);
```

## Backends

### Local filesystem

```ts
const local = createLocalBackend('/var/lib/app/uploads');
```

- Creates nested directories for keys containing slashes.
- Rejects keys that escape the root directory.
- Serves full objects and single byte ranges as streams.
- `open()` returns `{ kind: "stream" }` or `{ kind: "rangeNotSatisfiable" }`.

### S3-compatible storage

The S3 backend takes an injected client, so this package has no AWS SDK
dependency. The client only needs these methods:

```ts
type S3StorageClient = {
	putObject(input: { key; file; contentType; bucket? }): Promise<{ key: string }>;
	getObject(input: { key; bucket? }): Promise<{ ok: true; objectBuffer } | { ok: false; error }>;
	deleteObject(input: { key; bucket? }): Promise<string | null>;
	getSignedUrl(input: {
		key;
		bucket?;
		filename?;
		download?;
		expirityTime?;
	}): Promise<{ signedUrl } | { signedUrl: null; error }>;
	bucketExists?(input?: { bucket? }): Promise<boolean>;
	createBucket?(input: { name }): Promise<unknown>;
};
```

Pass `createS3Client(...)` from `@ponado/s3`, or an app-local wrapper:

```ts
const s3 = createS3Backend({
	client: getS3(),
	bucket: process.env.S3_BUCKET_NAME,
	ensureBucket: true,
	check: async () => {
		await getS3().send(new ListBucketsCommand({}));
	}
});
```

- `ensureBucket` creates the bucket on `init()` when it is missing.
- `check` is the startup probe. Without it, `bucketExists` is used when a
  bucket is configured.
- `open()` returns `{ kind: "redirect", url }` with a presigned URL.

## The `open()` contract

`open()` never buffers the object in the app process:

```ts
type StorageReadResult =
	| { kind: 'redirect'; url: string }
	| {
			kind: 'stream';
			stream: ReadableStream<Uint8Array>;
			size: number;
			total: number;
			range?: { start: number; end: number; total: number };
	  }
	| { kind: 'rangeNotSatisfiable'; total: number };
```

A request handler maps it directly to a response:

- `redirect` → `302` to the presigned URL.
- `stream` → `200` (or `206` when `range` is set) with the stream body.
- `rangeNotSatisfiable` → `416` with `Content-Range: bytes */<total>`.

Use `get()` only for internal jobs such as backup and restore.

## Cleanup

`createLocalBackend` does not list objects. Orphan cleanup needs a `list()`
method; keep cleanup provider-specific (the S3 cleanup factory in ponado core)
until a backend-agnostic listing API is added.
