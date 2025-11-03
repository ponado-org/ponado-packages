import type { PaginatedTableResponse } from '$ponado-ui/table/types.js';

import { goto } from '$app/navigation';
import { page } from '$app/state';
import { createSvelteTable } from '$lib/components/ui/data-table/index.js';
import {
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type ColumnDef,
	type ColumnFiltersState,
	type InitialTableState,
	type PaginationState,
	type SortingState,
	type Table,
	type TableOptions,
	type VisibilityState
} from '@tanstack/table-core';


export function createInfiniteTable<T extends { id: number }>(params: {
	columns?: ColumnDef<T>[],
	initialState?: InitialTableState,
	getColumns: (params: { table: Table<T> }) => ColumnDef<T>[];
	invalidationKey?: string,
	getTableInfo: () => PaginatedTableResponse<T>;

}) {
	let columnFilters = $state<ColumnFiltersState>([]);
	let globalFilter = $state();
	let columns: ColumnDef<T>[] = $state([]);
	let columnVisibility = $state<VisibilityState>(params.initialState?.columnVisibility ?? { id: false });

	let sorting = $state<SortingState>(params.initialState?.sorting ?? []);
	let { rowCount, rows: data, pageSize } = $derived(params.getTableInfo())
	let pagination = $state<PaginationState>({ pageIndex: Number(page.url.searchParams.get("pageIndex") || '0'), pageSize });

	const options: TableOptions<T> = {
		manualSorting: true,
		manualFiltering: true,
		manualPagination: true,

		get rowCount() {
			return rowCount;
		},

		get data() {
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
			}
		},

		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),

		onPaginationChange: async (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}

			updateSearchParams();
		},

		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = [...updater, { id: 'id', desc: true }];
			}
			pagination.pageIndex = 0
			updateSearchParams()
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

			pagination.pageIndex = 0
			updateSearchParams();
		},
		globalFilterFn: 'includesString'
	};

	const table = createSvelteTable(options);

	columns = params.getColumns({ table })

	function updateSearchParams() {

		const searchParams = new URLSearchParams();

		columnFilters.forEach((v) => {

			if (typeof v.value === 'string' || typeof v.value === 'number' || typeof v.value === 'boolean') {
				searchParams.set(v.id, v.value.toString());
			} else if (Array.isArray(v.value) && v.value.length > 0) {
				searchParams.set(v.id, v.value.join(","))
			} else {
				console.warn(`Unexpected value type: ${typeof v.value}`);
			}
		});

		sorting.forEach(it => {
			searchParams.set("sortCol", it.id)
			searchParams.set("sortDir", it.desc ? "desc" : "asc")
		})

		searchParams.set('pageIndex', pagination.pageIndex.toString());
		searchParams.set('pageSize', pagination.pageSize.toString());

		const newUrl = `${page.url.origin}${page.url.pathname}?${searchParams.toString()}`;

		goto(newUrl);
	}

	return { table };
}
