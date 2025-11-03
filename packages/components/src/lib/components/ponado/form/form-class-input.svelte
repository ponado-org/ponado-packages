<script lang="ts" module>
	import {
		arrayProxy,
		type FormPath as _FormPath,
		type FormPathArrays,
		type SuperForm,
	} from "sveltekit-superforms";
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import * as Form from "$scn/form/index.js";
	import { ClassInput } from "$ponado-ui/filters/index.js";

	interface Props {
		description?: string | null | undefined;
		field: FormPathArrays<T>;
		label: string;
		superform: SuperForm<T>;
		onValueChange?: (e: any) => void;
	}

	let { field, description, label, superform }: Props = $props();

	const { values } = arrayProxy(superform, field);
</script>

<Form.Field class="input-field" form={superform} name={field}>
	<Form.Control>
		<ClassInput name={field} {label} bind:value={$values as any} />
	</Form.Control>
	{#if description}
		<Form.Description>{description}</Form.Description>
	{/if}
	<Form.FieldErrors />
</Form.Field>
