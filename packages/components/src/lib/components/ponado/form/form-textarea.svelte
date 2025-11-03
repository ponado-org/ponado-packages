<script lang="ts" module>
	import {
		formFieldProxy,
		type FormPathLeaves,
		type SuperForm,
	} from "sveltekit-superforms";
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import * as Form from "$scn/form/index.js";
	import { cn } from "$lib/utils.js";
	import type { HTMLInputAttributes } from "svelte/elements";
	import { Textarea } from "$scn/textarea/index.js";

	type Props = HTMLInputAttributes & {
		superform: SuperForm<T>;
		label?: string;
		field: FormPathLeaves<T>;
		description?: string;
	};

	let { superform, description, label, field }: Props = $props();

	const { value, errors } = formFieldProxy(superform, field);
</script>

<Form.Field form={superform} name={field}>
	<Form.Control>
		{#snippet children({ props })}
			<Form.Label>{label}</Form.Label>
			<Textarea {...props} bind:value={$value as string} />
			{#if description}
				<Form.Description
					>{description}</Form.Description
				>
			{/if}
		{/snippet}
	</Form.Control>
	<Form.FieldErrors />
</Form.Field>

<!-- <Form.Field class={cn(["form-field "])} form={superform} name={field}> -->
<!-- 	<Form.Control> -->
<!-- 		{#snippet children({ props })} -->
<!-- 			{#if label} -->
<!-- 				<Form.Label>{label}</Form.Label> -->
<!-- 			{/if} -->
<!-- 			<Textarea -->
<!-- 				{...props} -->
<!-- 				{...rest} -->
<!-- 				name={field} -->
<!-- 				aria-invalid={$errors ? "true" : undefined} -->
<!-- 				bind:value={$value as any} -->
<!-- 			/> -->
<!-- 		{/snippet} -->
<!-- 	</Form.Control> -->
<!-- 	<!-- <Form.Description>Parapijos pavadinimas</Form.Description> --> -->
<!-- 	<Form.FieldErrors /> -->
<!-- </Form.Field> -->
