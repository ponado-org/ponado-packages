<script lang="ts" module>
	import {
		arrayProxy,
		formFieldProxy,
		type FormPath as _FormPath,
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
	import { Select } from "$ponado-ui/filters/index.js";
	import {
		type SelectOptionType,
		type SelectPropsBase,
	} from "$ponado-ui/shared-types.js";

	type Props = SelectPropsBase<OType> & {
		superform: SuperForm<T>;
		field: FormPath<T>;
	};

	let { superform, multiple, field, ...rest }: Props = $props();

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

<Form.Field class={cn(["form-field "])} form={superform} name={field}>
	<Form.Control>
		{#snippet children()}
			<Select {...rest} bind:value={$values} name={field} />
		{/snippet}
	</Form.Control>
	<!-- <Form.Description>Parapijos pavadinimas</Form.Description> -->
	<Form.FieldErrors />
</Form.Field>
<!-- <input name={field} value={$values} hidden /> -->
