import type {
	CatalogSearchResult,
	CurrencyCode,
	InventoryType,
	ListingDTO,
	ListingStatus,
	OrderStatus,
	ProductDTO,
	ProductMarketInfo,
	RequestResult,
	SellingListResponse,
	StockXOrderDTO,
	StockXOrdersResponse,
	VariantDTO,
	VariantMarketInfo
} from './types';

type StringOrNumber = string | number;

type LoggerFn = (obj: object | string, msg?: string) => void;

type Logger = {
	info: LoggerFn;
	error: LoggerFn;
	fatal: LoggerFn;
	warn: LoggerFn;
};

export class StockxClient {
	#logger: Logger | undefined;
	#callbackUrl: string;
	#apiUrl: string = 'https://api.stockx.com/v2';
	#apiKey: string;
	#clientId: string;
	#clientSecret: string;
	#refreshToken: string;
	#accessToken: string | undefined | null;
	#requestQueue: Array<() => Promise<void>> = [];
	#isProcessing = false;
	#lastRequestTime = 0;
	#minRequestInterval = 1000; // milliseconds between requests (10 req/sec)
	#onTokenRefresh?: (newAccessToken: string) => Promise<void> | void;
	#maxRetries = 3; // Maximum number of retries for failed requests
	#retryDelay = 2000; // Initial retry delay in milliseconds

	constructor(opt: {
		clientId: string;
		clientSecret: string;
		refreshToken: string;
		accessToken?: string | null;
		apiKey: string;
		apiUrl?: string;
		callbackUrl: string;
		onTokenRefresh?: (newAccessToken: string) => Promise<void> | void;
		maxRetries?: number;
		retryDelay?: number;
		logger?: Logger;
	}) {
		this.#clientId = opt.clientId;
		this.#clientSecret = opt.clientSecret;
		this.#refreshToken = opt.refreshToken;
		this.#apiKey = opt.apiKey;
		this.#apiUrl = opt.apiUrl ? opt.apiUrl : this.#apiUrl;
		this.#accessToken = opt.accessToken;
		this.#callbackUrl = opt.callbackUrl;
		this.#onTokenRefresh = opt.onTokenRefresh;
		this.#logger = opt.logger;

		if (opt.maxRetries !== undefined) this.#maxRetries = opt.maxRetries;
		if (opt.retryDelay !== undefined) this.#retryDelay = opt.retryDelay;
	}

	#throttle<T>(fn: () => Promise<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			this.#requestQueue.push(async () => {
				try {
					const result = await fn();
					resolve(result);
				} catch (error) {
					reject(error);
				}
			});

			void this.#processQueue();
		});
	}

	async #processQueue() {
		if (this.#isProcessing || this.#requestQueue.length === 0) {
			return;
		}

		this.#isProcessing = true;

		while (this.#requestQueue.length > 0) {
			const now = Date.now();
			const timeSinceLastRequest = now - this.#lastRequestTime;

			if (timeSinceLastRequest < this.#minRequestInterval) {
				await new Promise((resolve) =>
					setTimeout(resolve, this.#minRequestInterval - timeSinceLastRequest)
				);
			}

			const request = this.#requestQueue.shift();
			if (request) {
				this.#lastRequestTime = Date.now();
				await request();
			}
		}

		this.#isProcessing = false;
	}

	async #sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	#shouldRetry(status: number): boolean {
		// Retry on server errors (5xx) and rate limiting (429)
		// Don't retry on client errors (4xx) except 429
		return status >= 500 || status === 429;
	}

	toUrlSearchParams<
		T extends Record<string, undefined | boolean | StringOrNumber | StringOrNumber[]>
	>(params?: T): URLSearchParams {
		const searchParams = new URLSearchParams();

		if (!params) {
			return searchParams;
		}

		for (const [key, value] of Object.entries(params)) {
			if (value != null) {
				// covers undefined & null
				searchParams.append(key, Array.isArray(value) ? value.join(',') : String(value));
			}
		}

		return searchParams;
	}

	#makeRequest<TData>(
		opt: {
			endpoint: string;
			searchParams?: URLSearchParams | Record<string, string>;
			method?: 'GET' | 'PATCH' | 'PUT' | 'DELETE';
		},
		allowTokenRefresh = true
	): Promise<RequestResult<TData>> {
		return this.#throttle(async () => {
			let lastError: RequestResult<TData> | null = null;

			for (let attempt = 0; attempt <= this.#maxRetries; attempt++) {
				// Exponential backoff for retries (but not first attempt)
				if (attempt > 0) {
					const delay = this.#retryDelay * Math.pow(2, attempt - 1);
					this.#logger?.info(
						`Retry attempt ${attempt}/${this.#maxRetries} after ${delay}ms delay`
					);
					await this.#sleep(delay);
				}

				const options: RequestInit = {
					method: opt.method ?? 'GET',
					headers: {
						Authorization: `Bearer ${this.#accessToken}`,
						'x-api-key': this.#apiKey,
						'Content-Type': 'application/json'
					}
				};

				let url = `${this.#apiUrl}${opt.endpoint}`;
				if (opt.searchParams) {
					const params =
						opt.searchParams instanceof URLSearchParams
							? opt.searchParams
							: new URLSearchParams(opt.searchParams);
					const queryString = params.toString();
					if (queryString) {
						url += `?${queryString}`;
					}
				}

				try {
					const r = await fetch(url, options);

					if (r.ok) {
						return {
							ok: true,
							type: 'success',
							status: r.status,
							data: (await r.json()) as TData
						};
					}

					// Handle 401 - token expired (only try to refresh once)
					if (r.status === 401 && allowTokenRefresh) {
						this.#logger?.error('Received unauthorized, attempting token refresh');
						try {
							const newAccessToken = await this.#getAccessToken();
							if (!newAccessToken) {
								this.#logger?.error('Failed to refresh StockX token');
								return {
									ok: false,
									type: 'error',
									status: 401,
									error: 'Token refresh failed'
								};
							}

							this.#logger?.info('Access token refreshed successfully');
							this.#accessToken = newAccessToken;

							if (this.#onTokenRefresh) {
								await this.#onTokenRefresh(newAccessToken);
							}

							// FIXED: Retry immediately with new token in the same throttled execution
							const retryOptions: RequestInit = {
								method: opt.method ?? 'GET',
								headers: {
									Authorization: `Bearer ${this.#accessToken}`, // Using the NEW token
									'x-api-key': this.#apiKey,
									'Content-Type': 'application/json'
								}
							};

							const retryResponse = await fetch(url, retryOptions);

							if (retryResponse.ok) {
								this.#logger?.info('Retry after token refresh succeeded');

								return {
									ok: true,
									type: 'success',
									status: retryResponse.status,
									data: (await retryResponse.json()) as TData
								};
							}

							// If retry failed, store error and continue with normal retry logic
							const errorText = await retryResponse.text();

							this.#logger?.error(
								{
									errorText
								},
								'Retry after token refresh failed:'
							);

							// Check if we should retry this error
							if (!this.#shouldRetry(retryResponse.status)) {
								return {
									ok: false,
									type: 'error',
									status: retryResponse.status,
									error: retryResponse.statusText || errorText
								};
							}

							lastError = {
								ok: false,
								type: 'error',
								status: retryResponse.status,
								error: retryResponse.statusText || errorText
							};

							// Continue to next retry attempt if available
							if (attempt === this.#maxRetries) {
								return lastError;
							}
							continue;
						} catch (e) {
							this.#logger?.error({ error: e }, 'StockX token refresh failed');

							return {
								ok: false,
								type: 'error',
								status: 401,
								error: 'Token refresh failed'
							};
						}
					}

					// Check if we should retry this error
					if (!this.#shouldRetry(r.status)) {
						this.#logger?.error(
							`Request failed with non-retryable status ${r.status}:`
						);

						return {
							ok: false,
							type: 'error',
							status: r.status,
							error: r.statusText
						};
					}

					// Store error for potential retry
					const errorText = await r.text();

					this.#logger?.error(
						{ error: errorText },
						`Request failed (attempt ${attempt + 1}/${this.#maxRetries + 1}):`
					);

					lastError = {
						ok: false,
						type: 'error',
						status: r.status,
						error: r.statusText || errorText
					};

					// If this was the last attempt, return the error
					if (attempt === this.#maxRetries) {
						return lastError;
					}
				} catch (e) {
					// Network errors, timeouts, etc.
					this.#logger?.error(
						{ error: e },
						`Network error (attempt ${attempt + 1}/${this.#maxRetries + 1}):`
					);

					lastError = {
						ok: false,
						type: 'error',
						status: 0,
						error: e instanceof Error ? e.message : 'Network error'
					};

					// If this was the last attempt, return the error
					if (attempt === this.#maxRetries) {
						return lastError;
					}
				}
			}

			// This should never be reached, but TypeScript needs it
			return (
				lastError || {
					ok: false,
					type: 'error',
					status: 0,
					error: 'Unknown error'
				}
			);
		});
	}

	async #getAccessToken() {
		const res = await fetch('https://accounts.stockx.com/oauth/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				client_id: this.#clientId,
				client_secret: this.#clientSecret,
				audience: 'gateway.stockx.com',
				refresh_token: this.#refreshToken,
				redirect_uri: this.#callbackUrl
			})
		});

		if (!res.ok) {
			throw new Error(`StockX token exchange failed: ${res.status}: ${res.statusText}`);
		}

		const r = (await res.json()) as { access_token?: string };

		return r.access_token;
	}

	async getVariantMarketInfo({
		productId,
		variantId,
		currecyCode = 'EUR'
	}: {
		currecyCode?: CurrencyCode;
		productId: string;
		variantId: string;
	}): Promise<RequestResult<VariantMarketInfo>> {
		const url = new URL(
			`${this.#apiUrl}/catalog/products/${productId}/variants/${variantId}/market-data`
		);

		url.searchParams.set('currencyCode', currecyCode);

		const res = await this.#makeRequest({
			endpoint: url.toString()
		});

		if (res.type === 'success') {
			return {
				ok: true,
				type: 'success',
				status: 200,
				data: res.data as VariantMarketInfo
			};
		}

		return res;
	}

	getSellingListings(opt?: {
		pageNumber?: number;
		pageSize?: number;
		productIds?: number[];
		variantIds?: number[];
		batchIds?: number[];
		fromDate?: string;
		listingStatuses?: ListingStatus[];
		inventoryTypes?: InventoryType[];
		initiatedShipmentDisplayIds?: string;
		isExpired?: boolean;
	}) {
		const searchParams = this.toUrlSearchParams(opt);

		return this.#makeRequest<SellingListResponse>({
			endpoint: '/selling/listings',
			searchParams
		});
	}

	getOrders(
		opt: {
			pageNumber?: number;
			pageSize?: number;
			orderStatus?: OrderStatus;
			productId?: string;
			variantId?: string;
			inventoryTypes?: InventoryType;
			initiatedShipmentDisplayIds?: string[];
		} = {}
	) {
		const { pageNumber = 1, pageSize = 10, ...rest } = opt;

		return this.#makeRequest<StockXOrdersResponse>({
			endpoint: '/selling/orders/active',
			searchParams: this.toUrlSearchParams({ pageNumber, pageSize, ...rest })
		});
	}

	async getAllOrders() {
		let hasNextPage = true;
		let pageNumber = 1;
		const activeOrders: StockXOrderDTO[] = [];

		while (hasNextPage) {
			const response = await this.getOrders({
				pageNumber,
				pageSize: 100
			});

			if (!response.ok) {
				this.#logger?.fatal('Failed to get active orders from stockx');
				throw new Error();
			}

			if (pageNumber === 1) {
				this.#logger?.info('Total number of active orders is: ' + response.data.count);
			}

			activeOrders.push(...response.data.orders);
			pageNumber++;
			hasNextPage = response.data.hasNextPage;

			this.#logger?.info({ pageNumber, hasNextPage }, 'Order page received');
		}

		return activeOrders;
	}

	getMarketDataForVariant({
		currencyCode = 'EUR',
		productId,
		variantId
	}: {
		currencyCode?: CurrencyCode;
		productId: string;
		variantId: string;
	}) {
		const searchParams = this.toUrlSearchParams({ currencyCode });

		return this.#makeRequest<ProductMarketInfo>({
			endpoint: `/catalog/products/${productId}/variants/${variantId}/market-data`,
			searchParams
		});
	}

	getVariant({ productId, variantId }: { productId: string; variantId: string }) {
		return this.#makeRequest<VariantDTO>({
			endpoint: `/catalog/products/${productId}/variants/${variantId}`
		});
	}

	// Fetches a product by either its slug or StockX ID (both are accepted as `productId`)
	getProduct({ productId }: { productId: string }) {
		return this.#makeRequest<ProductDTO>({
			endpoint: `/catalog/products/${productId}`
		});
	}

	searchCatalog({
		query,
		pageSize,
		pageIndex
	}: {
		query: string;
		pageIndex?: number;
		pageSize?: number;
	}) {
		const searchParams = new URLSearchParams({ query });

		if (pageIndex && pageSize) {
			searchParams.set('pageIndex', pageIndex.toString());
			searchParams.set('pageSize', pageSize.toString());
		}

		return this.#makeRequest<CatalogSearchResult>({
			endpoint: `/catalog/search?${searchParams.toString()}`
		});
	}

	async getAllListings({ limit, pageSize }: { pageSize: number; limit: number }) {
		let hasNext = true;
		let pageNumber = 1;
		const listings: ListingDTO[] = [];

		while (hasNext && listings.length < limit) {
			this.#logger?.info(`Downloading listings page ${pageNumber}`);

			const listingsResult = await this.getSellingListings({
				listingStatuses: ['ACTIVE'],
				pageNumber,
				pageSize
			});

			if (!listingsResult.ok) {
				throw new Error('Failed to get listings');
			}

			listings.push(...listingsResult.data.listings);

			hasNext = listingsResult.data.hasNextPage;
			pageNumber++;
		}

		return listings;
	}
}
