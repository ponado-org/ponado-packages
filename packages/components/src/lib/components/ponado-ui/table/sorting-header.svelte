<script lang="ts">
	import { Button } from '$scn/button/index.js';
	import type { SortDirection } from '@tanstack/table-core';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import { ArrowDown, ArrowUp } from '@lucide/svelte';

	interface SortingHeaderProps {
		title: string;
		onclick: () => void;
		state: false | SortDirection;
	}

	let { title, onclick, state }: SortingHeaderProps = $props();
</script>

<Button variant="ghost" class="hover:bg-primary/20 " {onclick}>
	<p class="font-semibold">
		{title}
	</p>
	{#if state === false}
		<ArrowUpDown class="!text-muted-foreground" />
	{:else if state === 'asc'}
		<ArrowUp class="!text-muted-foreground" />
	{:else if state === 'desc'}
		<ArrowDown class="!text-muted-foreground" />
	{/if}
</Button>
