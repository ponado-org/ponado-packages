# @ponado/s3

AWS S3 wrapper with common operations and automatic file type detection.

## Installation

```bash
pnpm add @ponado/s3
```

## Usage

```typescript
import { createS3Client } from '@ponado/s3';

const s3 = createS3Client({
	region: 'us-east-1',
	endpoint: 'https://s3.amazonaws.com',
	defaultBucket: 'my-bucket',
	credentials: {
		accessKeyId: 'your-access-key',
		secretAccessKey: 'your-secret-key'
	},
	forcePathStyle: false
});

// Upload a file
const result = await s3.uploadObject({
	file: buffer,
	fileId: 'unique-id'
});

// Get a signed URL
const { signedUrl } = await s3.getSignedUrl({ key: 'path/to/file' });

// Download a file
const { objectBuffer } = await s3.getObject({ key: 'path/to/file' });

// Delete files
await s3.deleteObject({ key: 'path/to/file' });
await s3.deleteObjects({ keys: ['file1', 'file2'] });
await s3.deleteObjectByPrefix({ keyOrPrefix: 'folder/' });
```

## Features

- Automatic file type detection from buffer content
- Signed URL generation
- Batch operations (delete multiple objects)
- Bucket cloning between buckets
- Works with S3-compatible services (MinIO, etc.)

## API

### `createS3Client(config)`

Creates an S3 client instance with the following methods:

- `uploadObject({ file, fileId, bucket? })` - Upload a file with auto-detected type
- `getObject({ key, bucket? })` - Download a file as a Buffer
- `getSignedUrl({ key, bucket?, expirityTime? })` - Generate a pre-signed URL
- `deleteObject({ key, bucket? })` - Delete a single object
- `deleteObjects({ keys, bucket? })` - Delete multiple objects
- `deleteObjectByPrefix({ keyOrPrefix, bucket? })` - Delete all objects matching a prefix
- `saveOrReplaceObject({ file, key?, fileId, bucket? })` - Replace existing file
- `cloneBucket({ sourceBucket, targetBucket, fromPrefix?, toPrefix? })` - Copy objects between buckets
- `listBuckets()` - List all buckets
- `createBucket({ name })` - Create a new bucket
- `send(command)` - Send raw AWS SDK commands
