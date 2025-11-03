<script lang="ts" generics="T">
	import { Button } from '$scn/button/index.js';
	import { Input } from '$scn/input/index.js';
	import { CirclePlus } from '@lucide/svelte';
	import type { Table } from '@tanstack/table-core';
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		title: string;
		table?: Table<T>;
		createNewLink?: string | undefined | null;
		createNewLinkText?: string | undefined | null;
	}

	const { title, createNewLink, createNewLinkText, children, table }: Props = $props();
</script>

<div class="flex w-full items-center justify-between gap-2">
	<h1 class="my-5 flex-1 font-bold whitespace-break-spaces md:text-2xl">
		{title}
	</h1>

	{#if children || table}
		<div class="flex gap-3">
			{#if children}
				{@render children()}
			{/if}

			{#if table}
				<Input
					placeholder="Ieškoti..."
					class=" mt-auto flex-1 "
					oninput={(v) => table.setGlobalFilter(v.currentTarget.value)}
				/>
			{/if}
		</div>
	{/if}

	{#if createNewLink}
		<Button href={createNewLink} class="">
			<CirclePlus class="me-1" />
			<p class="hidden lg:block">
				{createNewLinkText ?? 'Kurti naują'}
			</p>
		</Button>
	{/if}
</div>
