<script lang="ts">
	import * as Card from '$scn/card/index.js';
	import type { Snippet } from 'svelte';

	interface CardProps {
		headerText?: string;
		children: Snippet;
		headerSnippet?: Snippet;
		class?: string;
	}
	const { headerText, class: className = '', children, headerSnippet }: CardProps = $props();
</script>

<Card.Root class={className}>
	<Card.Header>
		<div class="flex items-center justify-between">
			{#if headerText}
				<Card.Title class="text-lg">
					{headerText}
				</Card.Title>
			{/if}
			{#if headerSnippet}
				{@render headerSnippet()}
			{/if}
		</div>
	</Card.Header>

	<Card.Content class="h-full w-full">
		{@render children()}
	</Card.Content>
</Card.Root>
