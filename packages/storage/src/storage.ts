import type { StorageBackend, StorageProvider } from './types.js';

export type StorageBackendFactory<TProvider extends StorageProvider> =
	() => StorageBackend<TProvider>;

export interface CreateStorageOptions<TProvider extends StorageProvider> {
	/** Provider used when `get()` is called without one. */
	defaultProvider: TProvider;
	/** Lazy factories, keyed by provider. A backend is created on first use. */
	backends: Partial<Record<TProvider, StorageBackendFactory<TProvider>>>;
}

export interface StorageRegistry<TProvider extends StorageProvider> {
	readonly defaultProvider: TProvider;
	/** Resolve a backend by provider, or the default when omitted. */
	get(provider?: TProvider): StorageBackend<TProvider>;
}

/**
 * Provider registry. Reads should pass the provider stored with the record so
 * files written before a backend switch keep resolving correctly.
 */
export function createStorage<TProvider extends StorageProvider>({
	defaultProvider,
	backends
}: CreateStorageOptions<TProvider>): StorageRegistry<TProvider> {
	const instances = new Map<TProvider, StorageBackend<TProvider>>();

	function get(provider: TProvider = defaultProvider): StorageBackend<TProvider> {
		const existing = instances.get(provider);
		if (existing) return existing;

		const factory = backends[provider];
		if (!factory) {
			throw new Error(`storage: no backend configured for provider "${provider}"`);
		}

		const backend = factory();
		instances.set(provider, backend);
		return backend;
	}

	return { defaultProvider, get };
}
