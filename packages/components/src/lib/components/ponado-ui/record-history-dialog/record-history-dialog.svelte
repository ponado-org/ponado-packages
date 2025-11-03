<script lang="ts">
	import * as Dialog from '$scn/dialog/index.js';
	import type { RecordHistoryManager } from './record-history-manager.svelte.js';

	type Props = {
		recordHistoryManager: RecordHistoryManager;
	};

	const { recordHistoryManager }: Props = $props();

	const metadata = $derived(recordHistoryManager.dialogState.historyMetadata);
</script>

<Dialog.Root
	open={recordHistoryManager.open}
	onOpenChangeComplete={recordHistoryManager.onOpenChangeComplete}
>
	<Dialog.Content class="bg-secondary sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Įrašo istorija</Dialog.Title>
			<!-- <Dialog.Description> -->
			<!-- 	Make changes to your profile here. Click save when you're done. -->
			<!-- </Dialog.Description> -->
		</Dialog.Header>
		<div class="flex flex-col gap-2 py-4">
			<h3 class="font-semibold">Sukūrė:</h3>
			<div class="flex items-center gap-4 rounded-md border bg-background p-3 shadow-sm">
				<div>
					<div>{metadata?.createdBy}</div>
					<div class="text-nowrap">
						{metadata?.createdAt?.toLocaleString('lt') ?? 'Nėra informacijos'}
					</div>
				</div>
			</div>
			<h3 class="font-semibold">Atnaujino:</h3>
			<div
				class="flex items-center justify-between gap-4 rounded-md border bg-background p-3 shadow-sm"
			>
				<div class="w-full flex-1">
					<div>{metadata?.updatedBy}</div>
					<div class="text-nowrap">
						{metadata?.updatedAt?.toLocaleString('lt') ?? 'Nėra informacijos'}
					</div>
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
