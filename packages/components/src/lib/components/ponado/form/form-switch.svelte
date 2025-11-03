<script lang="ts" module>
	import {
		formFieldProxy,
		type FormPath as _FormPath,
		type FormPathLeaves,
		type SuperForm,
	} from "sveltekit-superforms";
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import * as Form from "$scn/form/index.js";
	import { cn } from "$lib/utils.js";
	import type { HTMLInputAttributes } from "svelte/elements";
	import { Switch, type SwitchProps } from "$ponado-ui/filters/index.js";

	type Props = SwitchProps &
		HTMLInputAttributes & {
			superform: SuperForm<T>;
			field: FormPathLeaves<T>; // Only allow boolean fields
		};

	let {
		superform,
		description,
		field,
		class: className,
		...rest
	}: Props = $props();

	const { value } = formFieldProxy(superform, field);
</script>

<Form.Field class={cn(className)} form={superform} name={field}>
	<Form.Control>
		{#snippet children({ props })}
			<Switch
				{...props}
				{...rest}
				bind:checked={$value}
				{className}
				{description}
				name={field}
			/>
		{/snippet}
	</Form.Control>
	<!-- <Form.Description>Parapijos pavadinimas</Form.Description> -->
	<Form.FieldErrors />
</Form.Field>
<input name={field} value={$value} hidden />
