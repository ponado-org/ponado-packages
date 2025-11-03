import { goto, invalidate } from '$app/navigation';
import { page } from '$app/state';
import { DEFAULT_PAGE_SIZE } from './constants.js';
import { createSvelteTable } from '$lib/components/ui/data-table/index.js';
import type { FormatRow } from './types.js';

import {
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type ColumnDef,
	type ColumnFiltersState,
	type InitialTableState,
	type PaginationState,
	type RowSelectionState,
	type SortingState,
	type Table,
	type TableOptions,
	type VisibilityState
} from '@tanstack/table-core';

interface Params<T extends { id: number }> {
	getRows: () => T[];
	getColumns: (props: { table: Table<T>, deleteRow: (id: number) => void }) => ColumnDef<T>[];
	// rows: T[];
	initialState?: InitialTableState;
	pageSize?: number;
	updateSearchParams?: boolean;
	manualFiltering?: boolean;
	manualOrdering?: boolean;
	getRowClass?: FormatRow<T>;
	invalidationKey?: string;
}

export function createTable<T extends { id: number }>(params: Params<T>) {

	let columnFilters = $state<ColumnFiltersState>(params.initialState?.columnFilters ?? []);
	let globalFilter = $state();
	let columns: ColumnDef<T>[] = $state([]);
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE });
	let columnVisibility = $state<VisibilityState>(params.initialState?.columnVisibility ?? { id: false });
	let sorting = $state<SortingState>(params.initialState?.sorting ?? []);
	let rowSelection = $state<RowSelectionState>({});
	let data = $derived(params.getRows())

	function updateSearchParams() {
		const searchParams = new URLSearchParams();

		columnFilters.forEach((v) => {
			if (
				typeof v.value === 'string' ||
				typeof v.value === 'number' ||
				typeof v.value === 'boolean'
			) {
				searchParams.set(v.id, v.value.toString());
			} else if (Array.isArray(v.value)) {

				const f = v.value as any[];

				if (f.length > 0) {
					searchParams.set(v.id, f.join(','));
				}
				else {
					console.warn(`Unexpected value type: ${typeof v.value}`);
				}
			}
		})

		sorting.forEach(it => {
			searchParams.set("sortCol", it.id)
			searchParams.set("sortDir", it.desc ? "desc" : "asc")
		})

		searchParams.set('pageIndex', pagination.pageIndex.toString());
		searchParams.set('pageSize', pagination.pageSize.toString());

		const newUrl = `${page.url.origin}${page.url.pathname}?${searchParams.toString()}`;
		goto(newUrl, { replaceState: true });
	}
	const options: TableOptions<T> = {
		manualFiltering: params.manualFiltering ?? true,
		manualSorting: params.manualOrdering ?? true,
		initialState: params.initialState,
		get data() {
			// return params.getRows();
			return data;
		},
		get columns() {
			return columns;
		},
		state: {
			get globalFilter() {
				return globalFilter;
			},
			get columnVisibility() {
				return columnVisibility;
			},
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get columnFilters() {
				return columnFilters;
			},
			get rowSelection() {
				return rowSelection
			}
		},

		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),

		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
		},

		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = [...updater, { id: 'id', desc: true }];
			}

			if (params.manualOrdering !== false) {
				updateSearchParams();
			}
		},

		onGlobalFilterChange: (updater) => {
			if (typeof updater === 'function') {
				globalFilter = updater(globalFilter);
			} else {
				globalFilter = updater;
			}
		},

		onColumnVisibilityChange: (updater) => {
			if (typeof updater === 'function') {
				columnVisibility = updater(columnVisibility);
			} else {
				columnVisibility = updater;
			}
		},

		onColumnFiltersChange: (updater) => {
			if (typeof updater === 'function') {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = updater;
			}

			if (params.updateSearchParams !== false) {
				updateSearchParams();
			}
		},
		onRowSelectionChange: (updater) => {
			if (typeof updater === "function") {
				rowSelection = updater(rowSelection);
			} else {
				rowSelection = updater;
			}
		},
		globalFilterFn: 'includesString'
	};

	const table = createSvelteTable(options);

	function deleteRow(rowID: number) {
		if (params.invalidationKey) {
			invalidate(params.invalidationKey)
		} else {
			data = data.filter(x => x?.id !== rowID)
		}
	}

	columns = params.getColumns({ table, deleteRow })

	return { table };
}
