<script lang="ts">
	import * as Popover from "$scn/popover/index.js";
	import { InfoIcon } from "@lucide/svelte";
	import type { Snippet } from "svelte";
	const {
		text,
		children,
	}: { class?: string; text: string; children?: Snippet } = $props();
</script>

<Popover.Root>
	<Popover.Trigger title={text}>
		{#if children}
			{@render children()}
		{:else}
			<InfoIcon size="20" class="inline-block" />
		{/if}
	</Popover.Trigger>
	<Popover.Content
		class="text-center max-w-[50rem] py-1 text-wrap text-sm bg-secondary dark:bg-secondary"
	>
		{text}
	</Popover.Content>
</Popover.Root>
