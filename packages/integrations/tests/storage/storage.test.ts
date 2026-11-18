import { describe, expect, it, vi } from 'vitest';
import { createStorage, type StorageBackend } from '../../src/storage/index.js';

function fakeBackend(provider: string): StorageBackend<string> {
	return {
		provider,
		async init() {},
		async check() {},
		async put({ key }) {
			return { key };
		},
		async get() {
			return null;
		},
		async delete() {},
		async deleteMany() {},
		async list() {
			return [];
		},
		async open() {
			return null;
		}
	};
}

describe('createStorage', () => {
	it('returns the default backend when no provider is passed', () => {
		const storage = createStorage({
			defaultProvider: 'local',
			backends: {
				local: () => fakeBackend('local'),
				s3: () => fakeBackend('s3')
			}
		});

		expect(storage.get().provider).toBe('local');
		expect(storage.get('s3').provider).toBe('s3');
	});

	it('creates each backend lazily and only once', () => {
		const localFactory = vi.fn(() => fakeBackend('local'));
		const storage = createStorage({
			defaultProvider: 'local',
			backends: { local: localFactory }
		});

		expect(localFactory).not.toHaveBeenCalled();
		storage.get();
		storage.get();
		expect(localFactory).toHaveBeenCalledOnce();
	});

	it('throws for an unconfigured provider', () => {
		const storage = createStorage({
			defaultProvider: 'local',
			backends: { local: () => fakeBackend('local') }
		});

		expect(() => storage.get('s3')).toThrow('no backend configured for provider "s3"');
	});
});
