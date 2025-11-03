<script lang="ts" generics="T">
	import { Button } from "$scn/button/index.js";
	import * as DropdownMenu from "$scn/dropdown-menu/index.js";
	import type { Table } from "@tanstack/table-core";
	import { Columns3Cog } from "@lucide/svelte";

	interface Props {
		table: Table<T>;
	}

	const { table }: Props = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				class="flex ml-auto text-muted-foreground"
			>
				<Columns3Cog />
				<p class="hidden lg:block">Stulpeliai</p>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		{#each table
			.getAllColumns()
			.filter((col) => col.getCanHide()) as column}
			<DropdownMenu.CheckboxItem
				class="capitalize"
				bind:checked={
					() => column.getIsVisible(),
					(v) => column.toggleVisibility(!!v)
				}
			>
				{column.columnDef?.meta?.headerTitle!}
			</DropdownMenu.CheckboxItem>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
