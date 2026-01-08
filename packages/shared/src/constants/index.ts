export enum MimeType {
	// 📄 Documents
	PDF = 'application/pdf',
	DOC = 'application/msword',
	DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	ODT = 'application/vnd.oasis.opendocument.text',
	ODS = 'application/vnd.oasis.opendocument.spreadsheet',

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
