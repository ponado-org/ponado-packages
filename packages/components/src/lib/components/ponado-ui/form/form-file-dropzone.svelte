<script module lang="ts">
	export const ALLOWED_DOCUMENT_EXTENTIONS = [
		'pdf',
		'jpg',
		'png',
		'jpeg',
		'heic',
		'webp',
		'svg',
		'.docx',
		'.odt'
	];
	const DEFAULT_DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_EXTENTIONS.map((x) => '.' + x).join(',');
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import * as Form from '$scn/form/index.js';
	import { Button } from '$scn/button/index.js';

	// import { DEFAULT_DOCUMENT_ACCEPT } from "$lib/constants";
	import { Eye, XIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';
	import {
		filesProxy,
		type FormPath,
		type FormPathArrays,
		type SuperForm
	} from 'sveltekit-superforms';
	import type { ClassValue } from 'svelte/elements';
	import { FileDropZone } from '$scn-extras/file-drop-zone/index.js';
	import { displaySize, type FileDropZoneProps } from '$scn-extras/file-drop-zone/index.js';
	import { FileRejectReasonTypeStrings } from '$scn-extras/file-drop-zone/types.js';
	import type { FileInfo } from '$ponado-ui/shared-types.js';

	interface Props {
		field: FormPathArrays<T, File[]>;
		label: string;
		disabled?: boolean;
		class?: ClassValue;
		superform: SuperForm<T>;
		hidden?: boolean;
		getSignedUrl?: (fileId: string) => Promise<string>;
		fileInfo?: FileInfo;
	}

	let {
		accept = DEFAULT_DOCUMENT_ACCEPT,
		hidden = false,
		class: className,
		superform,
		label,
		getSignedUrl,
		fileInfo,
		field,
		...rest
	}: Partial<FileDropZoneProps> & Props = $props();

	const handlePreview = async (id: string) => {
		if (getSignedUrl) {
			const signedUrl = await getSignedUrl(id);
			toast.info('signed url: ' + signedUrl);
		}
	};

	const files = filesProxy(superform, field as FormPathArrays<T, File[]>);

	const handleUpload: FileDropZoneProps['onUpload'] = async (uploadedFiles) => {
		console.log('uplaode f', uploadedFiles);
		files.set([...Array.from($files), ...uploadedFiles]);
	};

	const handleRejectedFile: FileDropZoneProps['onFileRejected'] = async ({ reason, file }) => {
		toast.error(`${file.name} nepavyko įkelti!`, {
			description: FileRejectReasonTypeStrings[reason]
		});
	};

	const deleteFile = (i: number) => {
		console.log('delte called id', i);
		files.set([...Array.from($files).slice(0, i), ...Array.from($files).slice(i + 1)]);
	};
</script>

{#snippet fileRow(name: string, size: number, idx: number, canDelete: boolean)}
	<div class="flex place-items-center justify-between gap-2 border bg-secondary p-1">
		<div class="flex flex-col">
			<span>{name}</span>
			<span class="text-xs text-muted-foreground">{displaySize(size)}</span>
		</div>
		{#if canDelete}
			<Button variant="outline" size="sm" onclick={() => deleteFile(idx)}>
				<XIcon />
			</Button>
		{/if}
	</div>
{/snippet}

<Form.Field
	class={cn('filter-field form-field w-[20rem]', className)}
	{hidden}
	form={superform}
	name={field}
>
	<Form.Control>
		{#snippet children({ props })}
			<!-- <Form.Label class="m-0 p-0">{label}</Form.Label> -->
			<FileDropZone
				{...props}
				{...rest}
				{accept}
				onUpload={handleUpload}
				onFileRejected={handleRejectedFile}
				fileCount={$files.length}
			/>
			<div class="flex flex-col gap-2">
				{#if fileInfo && $files.length === 0}
					{@render fileRow(fileInfo.name, fileInfo.size, 0, false)}
				{:else}
					{#each $files as file, idx}
						{@render fileRow(file.name, file.size, idx, true)}
					{/each}
				{/if}
			</div>
		{/snippet}
	</Form.Control>
	<Form.FieldErrors />
</Form.Field>

<input name={field} type="file" bind:files={$files} class="hidden" />
<input class="hidden" value={fileInfo?.fileId} name="fileId" />
