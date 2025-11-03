<script lang="ts">
	import * as Card from '$scn/card/index.js';
	import { Button } from '$scn/button/index.js';
	import { cn } from '$lib/utils.js';
	import { Save, Undo2 } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import type { SuperForm } from 'sveltekit-superforms';
	import { Spinner } from '$scn/spinner/index.js';

	type Props = {
		title: string;
		enctype?: HTMLFormAttributes['enctype'];
		class?: string;
		onSave?: () => void;
		onsubmit?: (e: Event) => void;
		children: Snippet;
		sideSnippet?: any | undefined;
		sideSnippetTitle?: string;
		description?: string;
		formData?: any;
		superform: SuperForm<any>;
	};

	let {
		children,
		enctype,
		title,
		onsubmit,
		description,
		onSave,
		sideSnippet,
		sideSnippetTitle,
		superform,
		class: className
	}: Props = $props();

	const { delayed, tainted } = superform;
</script>

<!-- <h1>form is tainted {isTainted()}</h1> -->
<!-- <h1>{JSON.stringify($tainted)}</h1> -->

<div class="flex w-full flex-col items-center justify-center gap-3 lg:flex-row">
	<Card.Root class={cn('w-full max-w-[60rem] md:w-auto md:min-w-160', className)}>
		<Card.Header>
			<Card.Title>{title}</Card.Title>
			{#if description}
				<Card.Description>{description}</Card.Description>
			{/if}
		</Card.Header>
		<Card.Content class="p-2 md:p-6">
			<form method="POST" {enctype} use:superform.enhance {onsubmit}>
				{@render children()}
				<div class="mt-5 flex gap-2">
					<Button
						type="button"
						onclick={() => history.back()}
						class="w-full"
						role="button"
						variant="outline"
					>
						<Undo2 />
						<p>Atgal</p>
					</Button>
					<Button onclick={onSave} disabled={!$tainted} type="submit" class="">
						<Save />
						<p>Saugoti</p>
						{#if $delayed && $delayed}
							<Spinner />
						{/if}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	{#if sideSnippet}
		<Card.Root class={cn('h-fit px-3', className)}>
			{#if sideSnippetTitle}
				<Card.Header>
					<Card.Title>{sideSnippetTitle}</Card.Title>
				</Card.Header>
			{/if}
			<Card.Content>
				{@render sideSnippet?.()}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
