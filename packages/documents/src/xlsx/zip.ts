import { deflateRawSync } from 'node:zlib';

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;

const VERSION = 20;
const UTF8_FLAG = 0x0800;
const DEFLATE_METHOD = 8;
/** 1980-01-01, the earliest DOS date. Fixed for reproducible archives. */
const DOS_DATE = 0x0021;
const DOS_TIME = 0;

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
	let crc = n;
	for (let bit = 0; bit < 8; bit++) {
		crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
	}
	CRC_TABLE[n] = crc >>> 0;
}

function crc32(data: Buffer): number {
	let crc = 0xffffffff;
	for (const byte of data) {
		crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

export type ZipEntry = {
	name: string;
	data: Buffer;
};

/**
 * Writes a ZIP archive with DEFLATE entries. XLSX files are ZIP packages, and
 * the format only needs the small subset implemented here: no ZIP64, no
 * encryption, no directories and no comments.
 */
export function createZip(entries: readonly ZipEntry[]): Buffer {
	const localParts: Buffer[] = [];
	const centralParts: Buffer[] = [];
	let offset = 0;

	for (const entry of entries) {
		const name = Buffer.from(entry.name, 'utf8');
		const compressed = deflateRawSync(entry.data);
		const checksum = crc32(entry.data);

		const local = Buffer.alloc(30);
		local.writeUInt32LE(LOCAL_FILE_HEADER, 0);
		local.writeUInt16LE(VERSION, 4);
		local.writeUInt16LE(UTF8_FLAG, 6);
		local.writeUInt16LE(DEFLATE_METHOD, 8);
		local.writeUInt16LE(DOS_TIME, 10);
		local.writeUInt16LE(DOS_DATE, 12);
		local.writeUInt32LE(checksum, 14);
		local.writeUInt32LE(compressed.length, 18);
		local.writeUInt32LE(entry.data.length, 22);
		local.writeUInt16LE(name.length, 26);
		local.writeUInt16LE(0, 28);
		localParts.push(local, name, compressed);

		const central = Buffer.alloc(46);
		central.writeUInt32LE(CENTRAL_DIRECTORY_HEADER, 0);
		central.writeUInt16LE(VERSION, 4);
		central.writeUInt16LE(VERSION, 6);
		central.writeUInt16LE(UTF8_FLAG, 8);
		central.writeUInt16LE(DEFLATE_METHOD, 10);
		central.writeUInt16LE(DOS_TIME, 12);
		central.writeUInt16LE(DOS_DATE, 14);
		central.writeUInt32LE(checksum, 16);
		central.writeUInt32LE(compressed.length, 20);
		central.writeUInt32LE(entry.data.length, 24);
		central.writeUInt16LE(name.length, 28);
		central.writeUInt16LE(0, 30);
		central.writeUInt16LE(0, 32);
		central.writeUInt16LE(0, 34);
		central.writeUInt16LE(0, 36);
		central.writeUInt32LE(0, 38);
		central.writeUInt32LE(offset, 42);
		centralParts.push(central, name);

		offset += local.length + name.length + compressed.length;
	}

	const centralDirectory = Buffer.concat(centralParts);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(END_OF_CENTRAL_DIRECTORY, 0);
	end.writeUInt16LE(0, 4);
	end.writeUInt16LE(0, 6);
	end.writeUInt16LE(entries.length, 8);
	end.writeUInt16LE(entries.length, 10);
	end.writeUInt32LE(centralDirectory.length, 12);
	end.writeUInt32LE(offset, 16);
	end.writeUInt16LE(0, 20);

	return Buffer.concat([...localParts, centralDirectory, end]);
}
