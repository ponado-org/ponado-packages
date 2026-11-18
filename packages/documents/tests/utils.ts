import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadFixture(name: string) {
	const filePath = path.join(__dirname, 'fixtures', name);
	return fs.readFileSync(filePath);
}
