<script lang="ts">
	import { Button, buttonVariants } from '$scn/button/index.js';
	import * as Dialog from '$scn/dialog/index.js';
	import { Input } from '$scn/input/index.js';
	import { Label } from '$scn/label/index.js';
	import { recordHistoryManager } from '$lib/managers/record-history-manager.svelte';

	const historyMetadata = $derived(recordHistoryManager.dialogState.historyMetadata);
</script>

<Dialog.Root
	open={recordHistoryManager.open}
	onOpenChangeComplete={recordHistoryManager.onOpenChangeComplete}
>
	<Dialog.Content class="sm:max-w-[425px] bg-secondary">
		<Dialog.Header>
			<Dialog.Title>Įrašo istorija</Dialog.Title>
			<!-- <Dialog.Description> -->
			<!-- 	Make changes to your profile here. Click save when you're done. -->
			<!-- </Dialog.Description> -->
		</Dialog.Header>
		<div class="flex flex-col gap-2 py-4">
			<h3 class="font-semibold">Sukūrė:</h3>
			<div class="flex items-center gap-4 border rounded-md p-3 bg-background shadow-sm">
				<div>
					<div>{historyMetadata?.createdBy}</div>
					<div class="text-nowrap">
						{historyMetadata?.createdAt?.toLocaleString('lt') ?? 'Nėra informacijos'}
					</div>
				</div>
			</div>
			<h3 class="font-semibold">Atnaujino:</h3>
			<div
				class="flex items-center gap-4 border rounded-md p-3 justify-between bg-background shadow-sm"
			>
				<div class="flex-1 w-full">
					<div>{historyMetadata?.updatedBy}</div>
					<div class="text-nowrap">
						{historyMetadata?.updatedAt?.toLocaleString('lt') ?? 'Nėra informacijos'}
					</div>
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
