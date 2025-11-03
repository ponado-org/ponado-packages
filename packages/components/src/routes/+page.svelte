<!-- <script lang="ts"> -->
<!-- 	import { FileDropzone } from '$ponado-ui/form/index.js'; -->
<!-- 	import { zod4 } from 'sveltekit-superforms/adapters'; -->
<!-- 	import SuperDebug, { defaults, superForm } from 'sveltekit-superforms'; -->
<!---->
<!-- 	import z from 'zod'; -->
<!---->
<!-- 	const schema = z.object({ -->
<!-- 		// names: z.array(nestedItem), -->
<!-- 		title: z.string(), -->
<!-- 		files: z.array(z.instanceof(File)) -->
<!-- 	}); -->
<!---->
<!-- 	const data: z.infer<typeof schema> = { -->
<!-- 		// names: [{ sub: ["wtf"] }], -->
<!-- 		title: 'ahah', -->
<!-- 		files: [] -->
<!-- 	}; -->
<!---->
<!-- 	const superform = superForm(defaults(data, zod4(schema)), { -->
<!-- 		SPA: true, -->
<!-- 		validators: zod4(schema), -->
<!-- 		dataType: 'json' -->
<!-- 	}); -->
<!---->
<!-- 	// const options: SelectOption[] = [{ value: 1, label: 'abcd' }]; -->
<!---->
<!-- 	const formData = superform.form; -->
<!---->
<!-- 	// const fileInfo: FileInfo = { -->
<!-- 	// 	size: 4 * 1024 * 1024, -->
<!-- 	// 	name: 'test failas.jpg', -->
<!-- 	// 	type: 'application/pdf', -->
<!-- 	// 	fileId: '1234' -->
<!-- 	// }; -->
<!-- </script> -->
<!---->
<!-- <SuperDebug data={$formData} /> -->
<!-- <!-- <Combobox --> -->
<!-- <!-- 	{superform} --> -->
<!-- <!-- 	{options} --> -->
<!-- <!-- 	value={1} --> -->
<!-- <!-- 	field={`names[0].sub[1]`} --> -->
<!-- <!-- 	label="label" --> -->
<!-- <!-- /> --> -->
<!-- <!----> -->
<!-- <!-- <Combobox --> -->
<!-- <!-- 	{superform} --> -->
<!-- <!-- 	{options} --> -->
<!-- <!-- 	value={"abcd"} --> -->
<!-- <!-- 	field="title" --> -->
<!-- <!-- 	label={`Name ${1}`} --> -->
<!-- <!-- /> --> -->
<!---->
<!-- <FileDropzone {superform} label="filele" field="files" accept=".pdf,.docx,.doc,docx" /> -->
