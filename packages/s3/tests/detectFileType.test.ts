import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { detectFileType } from '@src/index';
import { fileURLToPath } from 'url';
import path from 'path';

export enum MimeType {
	// 📄 Documents
	PDF = 'application/pdf',
	DOC = 'application/msword',
	DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	ODT = 'application/vnd.oasis.opendocument.text',
	RTF = 'application/rtf',
	TXT = 'text/plain',
	CSV = 'text/csv',
	JSON = 'application/json',
	XML = 'application/xml',
	HTML = 'text/html',
	MARKDOWN = 'text/markdown',

	// 🖼️ Images
	PNG = 'image/png',
	JPEG = 'image/jpeg',
	GIF = 'image/gif',
	SVG = 'image/svg+xml',
	WEBP = 'image/webp',
	BMP = 'image/bmp',
	ICO = 'image/x-icon',

	// 🎵 Audio
	MP3 = 'audio/mpeg',
	OGG = 'audio/ogg',
	WAV = 'audio/wav',
	AAC = 'audio/aac',
	FLAC = 'audio/flac',

	// 🎥 Video
	MP4 = 'video/mp4',
	WEBM = 'video/webm',
	OGV = 'video/ogg',
	MOV = 'video/quicktime',
	AVI = 'video/x-msvideo',

	// 🗜️ Archives
	ZIP = 'application/zip',
	TAR = 'application/x-tar',
	GZIP = 'application/gzip',
	_7Z = 'application/x-7z-compressed',
	RAR = 'application/vnd.rar'
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadFixture(name: string) {
	const filePath = path.join(__dirname, 'fixtures', name);
	return fs.readFileSync(filePath);
}

describe('detectFileType', () => {
	it('detects SVG file correctly', async () => {
		const buffer = loadFixture('sample.svg');
		const result = await detectFileType(buffer);
		expect(result).toEqual({ ext: 'svg', mime: MimeType.SVG });
	});

	it('detects JSON file correctly', async () => {
		const buffer = loadFixture('sample.json');
		const result = await detectFileType(buffer);
		expect(result).toEqual({ ext: 'json', mime: MimeType.JSON });
	});

	it('detects plain text file correctly', async () => {
		const buffer = loadFixture('sample.txt');
		const result = await detectFileType(buffer);
		expect(result).toEqual({ ext: 'txt', mime: MimeType.TXT });
	});

	it('detects PNG via file-type library', async () => {
		const buffer = loadFixture('sample.png');
		const result = await detectFileType(buffer);
		expect(result).toMatchObject({ ext: 'png', mime: MimeType.PNG });
	});

	it('returns null for unknown binary data', async () => {
		const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]);
		const result = await detectFileType(buffer);
		expect(result).toBeNull();
	});
});
