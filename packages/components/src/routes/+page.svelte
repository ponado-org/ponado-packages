<script lang="ts">
	import { Combobox } from "$ponado-ui/form/index.js";
	import { zod4 } from "sveltekit-superforms/adapters";
	import { defaults, superForm } from "sveltekit-superforms";
	import z from "zod";
	import type { SelectOption } from "$ponado-ui/shared-types.js";

	const nestedItem = z.object({
		sub: z.array(z.string()),
	});

	const schema = z.object({
		names: z.array(nestedItem),
		title: z.string(),
	});

	const data: z.infer<typeof schema> = {
		names: [{ sub: ["wtf"] }],
		title: "ahah",
	};

	const superform = superForm(defaults(data, zod4(schema)), {
		SPA: true,
		validators: zod4(schema),
	});

	const options: SelectOption[] = [{ value: 1, label: "abcd" }];
</script>

<Combobox
	{superform}
	{options}
	value={1}
	field={`names[0].sub[1]`}
	label="label"
/>

<Combobox
	{superform}
	{options}
	value={"abcd"}
	field="title"
	label={`Name ${1}`}
/>

<h1>Welcome to your library project</h1>
<p>
	Create your package using @sveltejs/package and preview/showcase your
	work with SvelteKit
</p>
<p>
	Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read
	the documentation
</p>
