import type { HTMLAttributeAnchorTarget } from 'svelte/elements';
export type FormatRow<T> = (row: T) => string;
import { type RecordHistoryManager } from "../record-history-dialog/record-history-manager.svelte.js";

export interface ActionLink {
	href: string;
	label: string;
	target?: HTMLAttributeAnchorTarget | null;
	condition?: boolean; // Optional condition to show/hide the link
}

export interface ActionButton {
	label: string;
	onclick: () => void;
	class?: string;
	icon?: any; // Lucide icon component
	iconClass?: string;
	condition?: boolean; // Optional condition to show/hide the button
}

type RowActionsBase = {
	id: number;
	relatedObjectType?: number;
	resourcePath: string | null;
	recordHistoryManager: RecordHistoryManager;
	links?: ActionLink[];
	buttons?: ActionButton[];
	showHistory?: boolean;
	deleteLabel?: string;
	historyLabel?: string;
};

type RowActionsWithDelete =
	| {
		showDelete: true;
		invalidateAfterDelete?: boolean;
		deleteRow?: (id: number) => void;
	}
	| {
		showDelete?: false;
		invalidateAfterDelete?: never;
		deleteRow?: never;
	};

export type TableRowActionProps = RowActionsBase & RowActionsWithDelete;
