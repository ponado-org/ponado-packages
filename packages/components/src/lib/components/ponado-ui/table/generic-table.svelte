<script lang="ts" module>
	export type FormatRow<T> = (row: T) => string;
</script>

<script lang="ts" generics="TData">
	import * as Table from '$scn/table/index.js';
	import { type Table as TanTable } from '@tanstack/table-core';

	import { Badge } from '$scn/badge/index.js';
	import { Button } from '$scn/button/index.js';
	import { FlexRender } from '$scn/data-table/index.js';
	import { Input } from '$scn/input/index.js';
	import { cn } from '$lib/utils.js';
	import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { type Snippet } from 'svelte';

	type DateTableProps<TData> = {
		table: TanTable<TData>;
		textFilter?: string;
		class?: string;
		getRowClass?: FormatRow<TData>;
		bottomSnippet?: Snippet;
	};

	let {
		table,
		textFilter,
		class: className,
		bottomSnippet,
		getRowClass
	}: DateTableProps<TData> = $props();
</script>

<!-- <pre>{JSON.stringify(table.getState().columnFilters)}</pre> -->

{#if textFilter}
	<Input
		placeholder="Ieškoti pagal pavadinimą...  "
		value={(table.getColumn(textFilter)?.getFilterValue() as string) ?? ''}
		onchange={(e) => {
			table.getColumn(textFilter)?.setFilterValue(e.currentTarget.value);
		}}
		oninput={(e) => {
			table.getColumn(textFilter)?.setFilterValue(e.currentTarget.value);
		}}
		class="m-3 "
	/>
{/if}

<div class={cn('overflow-x-auto rounded-md border ', className)}>
	<Table.Root class="">
		<Table.Header class="">
			{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
				<Table.Row>
					{#each headerGroup.headers as header (header.id)}
						{@const columnWidth = `${header.column.columnDef.size ? header.column.columnDef.size.toString() + 'px' : ' auto'};`}
						<!-- {@const customStyle = `min-width: ${header.column.columnDef.size ? header.column.columnDef.size.toString() + 'px' : ' auto'};`} -->
						<Table.Head
							class=""
							style={`width: ${columnWidth}; min-width: ${columnWidth}; max-width: ${columnWidth}`}
						>
							{#if !header.isPlaceholder}
								<FlexRender
									content={header.column.columnDef.header}
									context={header.getContext()}
								/>
							{/if}
						</Table.Head>
					{/each}
				</Table.Row>
			{/each}
		</Table.Header>
		<Table.Body>
			{#each table.getRowModel().rows as row (row.id)}
				<Table.Row
					class={cn('truncate', getRowClass && getRowClass(row.original))}
					data-state={row.getIsSelected() && 'selected'}
				>
					{#each row.getVisibleCells() as cell (cell.id)}
						{@const columnWidth = `${cell.column.columnDef.size ? cell.column.columnDef.size.toString() + 'px' : ' auto'};`}
						<Table.Cell
							title={cell.column.columnDef.meta?.hideDefaultTitle !== true
								? cell.getValue()?.toString()
								: null}
							style={`width: ${columnWidth}; min-width: ${columnWidth}; max-width: ${columnWidth}`}
							class="items-center truncate"
						>
							<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
						</Table.Cell>
					{/each}
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan={table.getAllColumns().length} class="h-24 text-center"
						>Nėra įrašų.</Table.Cell
					>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<div class="flex items-center justify-end space-x-2 py-4">
	<div class="flex items-center gap-5 text-nowrap">
		<div class="flex flex-wrap items-center gap-1">
			{#if bottomSnippet}
				{@render bottomSnippet()}
			{/if}

			{#if table.getPageCount() > 1}
				<Badge variant="outline">
					{@const rowCount = table.options.manualPagination
						? table.getRowCount()
						: table.getCoreRowModel().rows.length}
					<p>{rowCount} eil.</p>
				</Badge>
			{/if}

			{#if !table.options.manualPagination && table.getState().columnFilters.length > 0 && table.getFilteredRowModel().rows.length > 0}
				<Badge variant="outline">
					<p class="">
						{table.getFilteredRowModel().rows.length} eil.
					</p>
				</Badge>
			{/if}
		</div>

		{#if table.getPageCount() > 1}
			<p class="text-sm">
				{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
			</p>

			<div class="flex items-center space-x-2">
				<Button
					variant="outline"
					class="hidden h-8 w-8 p-0 lg:flex"
					onclick={() => table.setPageIndex(0)}
				>
					<span class="sr-only">Go to first page</span>
					<ChevronFirst class="dark:text-white" size={15} />
				</Button>

				<Button
					variant="outline"
					class="h-8 w-8 p-0"
					disabled={!table.getCanPreviousPage()}
					onclick={table.previousPage}
				>
					<span class="sr-only">Go to previous page</span>
					<ChevronLeft class="dark:text-white" size={15} />
				</Button>

				<Button
					variant="outline"
					class="h-8 w-8 p-0"
					disabled={!table.getCanNextPage()}
					onclick={table.nextPage}
				>
					<span class="sr-only">Go to next page</span>
					<ChevronRight class="dark:text-white" size={15} />
				</Button>
				<Button
					variant="outline"
					class="hidden h-8 w-8 p-0 lg:flex"
					onclick={() => table.setPageIndex(table.getPageCount() - 1)}
				>
					<span class="sr-only">Go to last page</span>
					<ChevronLast class="dark:text-white" size={15} />
				</Button>
			</div>
		{/if}
	</div>
</div>
