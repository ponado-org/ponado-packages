<script lang="ts" generics="T">
	import { GenericTable } from "./index.js";
	import type { FormatRow } from "./types.js";
	import { cn } from "$lib/utils.js";
	import type { Table } from "@tanstack/table-core";
	import type { Snippet } from "svelte";

	interface Props {
		table: Table<T>;
		filter?: Snippet;
		bottomSnippet?: Snippet;
		getRowClass?: FormatRow<T>;
		header: Snippet;
		class?: string;
		fullWidth?: boolean;
	}
	let {
		fullWidth,
		filter,
		table,
		header,
		class: className,
		getRowClass,
		bottomSnippet,
	}: Props = $props();
</script>

<div
	class={cn(
		"w-full",
		fullWidth ? "lg:max-w-[120rem] " : "lg:max-w-[100rem]",
		"flex  flex-col overflow-x-auto whitespace-nowrap p-3  2xl:flex-row 2xl:gap-3",
		className,
	)}
>
	{#if filter}
		{@render filter()}
	{/if}

	<div class="flex-1 overflow-x-auto">
		{@render header()}
		<GenericTable {table} {getRowClass} {bottomSnippet} />
	</div>
</div>
