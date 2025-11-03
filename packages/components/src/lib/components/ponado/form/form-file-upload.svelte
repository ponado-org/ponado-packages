<script module lang="ts">
	export const ALLOWED_DOCUMENT_EXTENTIONS = [
		"pdf",
		"jpg",
		"png",
		"jpeg",
		"heic",
		"webp",
		"svg",
		".docx",
		".odt",
	];
	const DEFAULT_DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_EXTENTIONS.map(
		(x) => "." + x,
	).join(",");
</script>

<script lang="ts" generics="T extends Record<string, unknown>">
	import * as Form from "$scn/form/index.js";
	import { Button } from "$scn/button/index.js";
	import { Label } from "$scn/label/index.js";
	import type { HTMLInputTypeAttribute } from "svelte/elements";

	// import { DEFAULT_DOCUMENT_ACCEPT } from "$lib/constants";
	import { Eye } from "@lucide/svelte";
	import { cn } from "$lib/utils.js";
	import { toast } from "svelte-sonner";
	import type { FormPath, SuperForm } from "sveltekit-superforms";

	interface Props {
		description?: string | null | undefined;
		field: FormPath<T>;
		label: string;
		disabled?: boolean;
		type?: HTMLInputTypeAttribute;
		placeholder?: string;
		superform: SuperForm<T>;
		files: FileList | null | undefined;
		step?: number;
		class?: string;
		hidden?: boolean;
		min?: number;
		onValueChange?: (e: any) => void;
		accept?: string;
		filePath?: string | undefined | null;
		fileId: string | undefined | null;
	}

	let {
		files = $bindable(),
		accept = DEFAULT_DOCUMENT_ACCEPT,
		hidden = false,
		field,
		class: className,
		fileId,
		label = "Dokumentas",
		superform,
		filePath,
	}: Props = $props();

	const getSignedUrl = async () => {
		const params = new URLSearchParams();
		params.set("fileId", `${fileId}`);

		const r = await fetch(
			"/api/documents/get-signed-url?" + params,
		);

		if (!r.ok) {
			toast.error("Atsiunčiant failą įvyko klaida");
			return;
		}

		const { signedUrl, mimeType } = await r.json();

		const fileResult = await fetch(signedUrl);

		if (!fileResult.ok) {
			toast.error("Atsiunčiant failą įvyko klaida");
			return;
		}

		const blob = await fileResult.blob();
		const url = URL.createObjectURL(blob);
		window.open(url, "_blank");
		// setTimeout(() => URL.revokeObjectURL(url), 1000 * 60 * 10);
	};
</script>

<Form.Field
	class={cn("filter-field form-field", className)}
	{hidden}
	form={superform}
	name={field}
>
	<Form.Control>
		{#snippet children({ props })}
			<Label class="m-0 p-0">{label}</Label>
			<div class="flex gap-3">
				<input
					bind:files
					type="file"
					name={field}
					class={cn(
						"border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
						className,
					)}
				/>
				{#if fileId}
					<Button
						class=""
						variant="outline"
						onclick={getSignedUrl}
					>
						<Eye class="dark:text-white" />
					</Button>
				{/if}
			</div>
		{/snippet}
	</Form.Control>
	<Form.FieldErrors />
</Form.Field>

<input class="hidden" value={filePath} name="filePath" />
<input class="hidden" value={fileId} name="fileId" />
