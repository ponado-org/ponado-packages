<script lang="ts" generics="T extends Record<string, unknown>">
	import * as Form from '$scn/form/index.js';
	import { cn } from '$lib/utils.js';
	import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';
	import { Input } from '$scn/input/index.js';
	import { formFieldProxy, type FormPathLeaves, type SuperForm } from 'sveltekit-superforms';

	type Props = HTMLInputAttributes & {
		superform: SuperForm<T>;
		label?: string;
		field: FormPathLeaves<T>;
		disabled?: boolean;
		class?: ClassValue | null;
		description?: string;
	};

	let {
		superform,
		label,
		description,
		disabled = false,
		field,
		class: className,
		...rest
	}: Props = $props();

	const { value } = formFieldProxy(superform, field);
</script>

<Form.Field hidden={rest.hidden} class={cn('', className)} form={superform} name={field}>
	<Form.Control>
		{#snippet children({ props })}
			<Form.Label>{label}</Form.Label>
			<Input {...props} {disabled} name={field} bind:value={$value} />
		{/snippet}
	</Form.Control>
	{#if description}
		<Form.Description>{description}</Form.Description>
	{/if}
	<Form.FieldErrors />
</Form.Field>
