import type { HTMLAttributeAnchorTarget } from 'svelte/elements';

export { default as DropdownMenu } from './dropdown-menu.svelte';

// Base properties shared by all dropdown items
type BaseDropdownItemProps = {
	label: string;
	onclick?: () => void;
	class?: string;
	icon?: any; // Lucide icon component
	iconClass?: string;
	condition?: boolean;
};

// Anchor link type
type DropdownAnchorItem = BaseDropdownItemProps & {
	type: 'a';
	href: string;
	target?: HTMLAttributeAnchorTarget | null;
};

// Button type
type DropdownButtonItem = BaseDropdownItemProps & {
	type: 'button';
	href?: never;
	target?: never;
	fileId?: never;
	isDownload?: never;
};

// Document link type - requires fileId
type DropdownDocumentLinkItem = BaseDropdownItemProps & {
	type: 'documentLink';
	fileId: string; // Required for documentLink
	isDownload: boolean;
	href?: never;
	target?: never;
};

// Union type - TypeScript will enforce the correct properties based on type
export type DropdownItemProps = DropdownAnchorItem | DropdownButtonItem | DropdownDocumentLinkItem;

export type DropdownItemType = DropdownItemProps['type'];
