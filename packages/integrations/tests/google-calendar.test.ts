import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createGoogleCalendarClient } from '../src/google-calendar/index.js';

const key = {
	client_email: 'sa@project.iam.gserviceaccount.com',
	private_key: 'not-a-real-pem'
};

const logger = { info: () => {}, warn: () => {}, error: () => {} };

let dir: string;
afterEach(() => {
	if (dir) rmSync(dir, { recursive: true, force: true });
	dir = '';
});

describe('calendar service account resolution', () => {
	it('reads the key from a file path', async () => {
		dir = mkdtempSync(join(tmpdir(), 'sa-'));
		const file = join(dir, 'sa.json');
		writeFileSync(file, JSON.stringify(key));

		const client = createGoogleCalendarClient({
			serviceAccountJsonPath: file,
			defaultCalendarId: 'calendar@example.com',
			logger
		});

		await expect(client.init()).resolves.toBeUndefined();
	});

	it('falls back to GOOGLE_APPLICATION_CREDENTIALS', async () => {
		dir = mkdtempSync(join(tmpdir(), 'sa-'));
		const file = join(dir, 'sa.json');
		writeFileSync(file, JSON.stringify(key));
		process.env.GOOGLE_APPLICATION_CREDENTIALS = file;

		const client = createGoogleCalendarClient({
			defaultCalendarId: 'calendar@example.com',
			logger
		});
		await expect(client.init()).resolves.toBeUndefined();

		delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
	});

	it('throws when no key is provided', async () => {
		delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
		const client = createGoogleCalendarClient({ logger });
		await expect(client.init()).rejects.toThrow('No service account key');
	});
});
