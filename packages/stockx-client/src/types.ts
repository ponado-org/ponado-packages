export type OrderStatus =
	| 'CREATED'
	| 'CCAUTHORIZATIONFAILED'
	| 'SHIPPED'
	| 'RECEIVED'
	| 'AUTHENTICATING'
	| 'AUTHENTICATED'
	| 'PAYOUTPENDING'
	| 'PAYOUTCOMPLETED'
	| 'SYSTEMFULFILLED'
	| 'PAYOUTFAILED'
	| 'SUSPENDED';

export type ListingStatus = 'INACTIVE' | 'ACTIVE' | 'CANCELED' | 'MATCHED' | 'COMPLETED';

export type VariantSize = { size: string; type: string };

export type CurrencyCode = 'EUR' | 'US';

export type InventoryType = 'STANDARD' | 'FLEX' | 'DIRECT';

export type VariantMarketInfo = {
	productId: string;
	variantId: string;
	currencyCode: CurrencyCode;
	lowestAskAmount: number;
	highestBidAmount: number;
	sellFasterAmount: string;
	earnMoreAmount: string;
	flexLowestAskAmount: string;
};

export type ProductDTO = {
	productId: string;
	brand: string;
	productType: string;
	styleId: string;
	urlKey: string;
	title: string;

	productAttributes: {
		color: string | null;
		colorway: string | null;
		gender: 'men' | 'women' | 'unisex' | string;
		releaseDate: string | null; // ISO date string if present
		retailPrice: number | null;
		season: string | null;
	};

	sizeChart: {
		defaultConversion: SizeConversion;
		availableConversions: SizeConversion[];
	};

	isFlexEligible: boolean;
	isDirectEligible: boolean;
};

export type SizeConversion = {
	name: string;
	type: string; // e.g. "uk", "us", "eu"
};

export type VariantDTO = {
	productId: string;
	variantId: string;
	variantName: string;
	variantValue: string;
	sizeChart: {
		defaultConversion: VariantSize;
		availableConversions: VariantSize[];
	};
	gtins: { identifier: string; type: string }[];
	isFlexEligible: boolean;
	isDirectEligible: string;
};

type StockxPaginationDTO = {
	count: number;
	pageSize: number;
	pageNumber: number;
	hasNextPage: boolean;
};

export type ListingDTO = {
	listingId: string;
	status: ListingStatus;
	amount: number;
	currencyCode: CurrencyCode;
	inventoryType: string;
	createdAt: string;
	updatedAt: string;
	batch: {
		batchId: string;
		taskId: string;
	};
	ask: {
		askId: string;
		askCreatedAt: string;
		askUpdatedAt: string;
		askExpiresAt: string;
	};
	authenticationDetails: {
		status: string;
		failureNotes: string;
	};
	order: {
		orderNumber: string;
		orderCreatedAt: string;
		orderStatus: string;
	};
	product: {
		productId: string;
		productName: string;
		styleId: string;
	};
	initiatedShipments: {
		inbound: {
			displayId: string;
		};
	};
	variant: {
		variantId: string;
		variantName: string;
		variantValue: string;
	};
};

export type SellingListResponse = StockxPaginationDTO & {
	listings: ListingDTO[];
};

export type MarketData = {
	beatUS: string;
	earnMore: string;
	sellFaster: string;
	highestBidAmount: string;
	lowestAsk: string;
};

export type ProductMarketInfo = {
	productId: string;
	variantId: string;
	currencyCode: string;
	lowestAskAmount: string;
	highestBidAmount: string;
	sellFasterAmount: string;
	earnMoreAmount: string;
	flexLowestAskAmount: string;
	standardMarketData: MarketData;
	flexMarketData: MarketData;
	directMarketData: MarketData;
};

export type ProductKicksResponse = {
	data: {
		id: string;
		title: string;
		brand: string;
		model: string;
		gender: string;
		description: string;
		image: string;
		sku: string;
		slug: string;
		product_type: string;
		category: string;
		secondary_category: string;
		categories: string[];
		breadcrumbs: Array<{
			value: string;
			alias: string;
			level: number;
		}>;
		gallery: string[];
		gallery_360: string[];
		updated_at: string;
		created_at: string;
		link: string;
		rank: number;
		weekly_orders: number;
		country_of_manufacture: string;
		primary_title: string;
		secondary_title: string;
		min_price: number;
		max_price: number;
		avg_price: number;
		short_description: string;
		upcoming: boolean;
	};
	meta: null | Record<string, unknown>;
};

export type StockXOrdersResponse = {
	count: number;
	pageSize: number;
	pageNumber: number;
	hasNextPage: boolean;
	orders: StockXOrderDTO[];
};

export type StockXOrderDTO = {
	orderNumber: string;
	listingId: string;
	askId: string;
	amount: string;
	currencyCode: CurrencyCode;
	status: OrderStatus;
	createdAt: string;
	updatedAt: string;
	product: {
		productId: string;
		productName: string;
		styleId: string;
	};
	variant: {
		variantId: string;
		variantName: string;
		variantValue: string;
	};
	authenticationDetails: {
		status: string;
		failureNotes: string;
	};
	payout: {
		totalPayout: number;
		salePrice: number;
		totalAdjustments: number;
		currencyCode: string;
		adjustments: {
			adjustmentType: string;
			amount: number;
			percentage: number;
		}[];
	};
	initiatedShipments: {
		inbound: {
			displayId: string;
		};
	};
	inventoryType: InventoryType;
};

export type RequestResult<T = unknown> =
	| {
			type: 'success';
			ok: true;
			status: number;
			data: T;
	  }
	| {
			ok: false;
			type: 'error';
			status: number;
			error?: string;
	  };
export type CatalogSearchResult = {
	count: number;
	pageSize: number;
	pageNumber: number;
	hasNextPage: boolean;
	products: {
		productId: string;
		urlKey: string;
		styleId: string;
		productType: string;
		title: string;
		brand: string;
		productAttributes: {
			gender: string;
			season: string;
			releaseDate: string;
			retailPrice: number;
			colorway: string;
			color: string;
		};
		sizeChart: {
			availableConversions: {
				name: string;
				type: string;
			}[];
			defaultConversion: {
				name: string;
				type: string;
			};
		};
		isFlexEligible: boolean;
		isDirectEligible: boolean;
	}[];
};
