<script lang="ts" generics="T extends Record<string, unknown>">
	import {
		formFieldProxy,
		type FormPathLeaves,
		type SuperForm,
	} from "sveltekit-superforms";
	import * as Form from "$scn/form/index.js";
	import { cn } from "$lib/utils.js";
	import { DateInput } from "$ponado-ui/filters/date-input/index.js";
	import { type DateValue } from "@internationalized/date";

	interface DateProps {
		description?: string;
		field: FormPathLeaves<T>;
		label: string;
		placeholder?: DateValue;
		maxValue?: DateValue;
		minValue?: DateValue;
		class?: string;
		disabled?: boolean;
		superform: SuperForm<T>;

		onValueChange?: (e: Date | undefined) => void;
	}

	let {
		class: className,
		onValueChange,
		field,
		maxValue,
		minValue,
		placeholder,
		disabled = false,
		label,
		superform,
	}: DateProps = $props();

	const dateValue = formFieldProxy(superform, field);
	const formValue = dateValue.value;
</script>

<Form.Field
	class={cn(["input-field", className])}
	form={superform}
	name={field}
>
	<Form.Control>
		<DateInput
			bind:value={$formValue}
			{placeholder}
			{disabled}
			{maxValue}
			{minValue}
			{onValueChange}
			{label}
			class={cn("", className)}
		/>
	</Form.Control>
	<!-- <Form.Description>Parapijos pavadinimas</Form.Description> -->
	<Form.FieldErrors />
	<input hidden name={field} value={$formValue} />
</Form.Field>
