<script lang="ts" module>
	import type {
		SelectOptionType,
		SelectPropsBase,
	} from "$ponado-ui/shared-types.js";
	import {
		arrayProxy,
		formFieldProxy,
		type FormPath,
		type FormPathArrays,
		type FormPathLeaves,
		type SuperForm,
	} from "sveltekit-superforms";
</script>

<script
	lang="ts"
	generics="T extends Record<string, unknown>,
	OType extends SelectOptionType,
"
>
	import * as Form from "$scn/form/index.js";
	import { cn } from "$lib/utils.js";
	import { Combobox } from "$lib/components/ponado/filters/index.js";

	type Props = SelectPropsBase<OType> & {
		superform: SuperForm<T>;
		field: FormPath<T>;
	};

	let { superform, multiple, field, ...rest }: Props = $props();

	// Conditionally create the appropriate proxy
	let values;

	if (multiple === true) {
		const proxy = arrayProxy(superform, field as FormPathArrays<T>);
		values = proxy.values;
	} else {
		const proxy = formFieldProxy(
			superform,
			field as FormPathLeaves<T>,
		);
		values = proxy.value;
	}
</script>

<Form.Field form={superform} name={field as any} class={cn("form-input")}>
	<Form.Control>
		{#snippet children({ props })}
			<Combobox
				{...props}
				{...rest}
				{multiple}
				name={field as string}
				bind:value={$values as any}
			/>
		{/snippet}
	</Form.Control>
	<!-- {#if description} -->
	<!-- 	<Form.Description>{description}</Form.Description> -->
	<!-- {/if} -->
	<Form.FieldErrors />
	<input hidden type="number" name={field as string} value={$values} />
</Form.Field>
