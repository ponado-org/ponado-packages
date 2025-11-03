<script lang="ts">
	import { Card } from '$ponado-ui/card';
	import { Button } from '$scn/button';
	import { RegistrationType } from '$lib/enums/app';
	import { Pencil, Trash } from '@lucide/svelte';
	import BadgeGroup from '$ponado-ui/badge/badge-group.svelte';
	import DocumentLink from '$ponado-ui/table/document-link.svelte';
	import type { PersonDasbhoardRowDTO } from '$lib/interfaces';
	import { DropdownMenu, type DropdownItemProps } from '../dropdown-menu';
	import { handleDelete } from '../table/utils';

	type Base = {
		rows: PersonDasbhoardRowDTO[];
		headerTitle: string;
		showFileOptions?: boolean;
		class?: string;
	};

	type Props =
		| (Base & {
				resourceUrl: string;
				canEdit: true;
		  })
		| (Base & {
				canEdit?: false;
				resourceUrl?: never;
		  });

	const {
		rows,
		headerTitle,
		class: className,
		canEdit = false,
		resourceUrl,
		showFileOptions = false
	}: Props = $props();

	// export type DropdownItemProps = {
	// 	label: string;
	// 	href: string;
	// 	target?: HTMLAttributeAnchorTarget | null;
	// 	onclick?: never;
	// 	class?: string;
	// 	icon?: any; // Lucide icon component
	// 	iconClass?: string;
	// 	condition?: boolean;
	// };

	const getDropdownItems = (dto: PersonDasbhoardRowDTO) => {
		const items: DropdownItemProps[] = [];
		// if(showFileOptions && dto.fileId) {
		// 	items.push({href: })
		// }
		if (dto.registrationType === RegistrationType.EXTERNAL && !dto.isLocked) {
			items.push(
				{
					type: 'a',
					href: `${resourceUrl}/${dto.id}/edit`,
					label: 'Redaguoti'
				},
				{
					type: 'button',
					label: 'Pašalinti',
					onclick: () =>
						handleDelete({
							endpoint: resourceUrl,
							id: dto.id
						})
				}
			);
		}
		if (showFileOptions && dto.fileId) {
			items.push(
				{
					type: 'documentLink',
					isDownload: false,
					fileId: dto.fileId,
					label: 'Peržiūrėti'
				},
				{
					type: 'documentLink',
					isDownload: true,
					fileId: dto.fileId,
					label: 'Atsisiųsti'
				}
			);
		}

		return items;
	};
</script>

{#snippet headerSnippet()}
	<Button variant="secondary" href={`${resourceUrl}/new/edit`}>
		<p class="hidden lg:block">Naujas</p>
		<PlusCircle class="size-8 dark:text-white" />
	</Button>
{/snippet}

{#snippet rowSnippet(rowDTO: PersonDasbhoardRowDTO)}
	<div class="flex flex-1 items-center w-full border-b py-3 gap-3 rounded-md">
		<span class="flex gap-2 flex-col flex-1 min-w-0">
			<div class="flex gap-2 min-w-0">
				<p class="text-nowrap flex-shrink-0">{rowDTO?.date?.toLocaleDateString('lt') ?? ''}</p>
				<p title={rowDTO.title} class=" min-w-0 flex-1">{rowDTO.title}</p>
			</div>
			<div class="flex items-center justify-between flex-wrap gap-3">
				<BadgeGroup wrap badges={rowDTO.badges} />

				<div class="lg:hidden ml-auto">
					<DropdownMenu items={getDropdownItems(rowDTO)} />
				</div>

				<div
					class="hidden lg:flex flex-col lg:flex-row ml-auto items-center lg:flex-row flex-shrink-0"
				>
					{#if showFileOptions && rowDTO.fileId}
						<DocumentLink variant="outline" fileId={rowDTO.fileId} />
						<DocumentLink variant="outline" fileId={rowDTO.fileId} isDownload />
					{/if}

					{#if rowDTO.registrationType === RegistrationType.EXTERNAL && !rowDTO.isLocked && canEdit}
						<Button
							variant="outline"
							class="dark:text-white size-8"
							href={`${resourceUrl}/${rowDTO.id}/edit`}
						>
							<Pencil class="dark:text-white" />
						</Button>
						<Button
							variant="destructive"
							class="dark:text-white size-8"
							onclick={() =>
								handleDelete({
									endpoint: resourceUrl,
									id: rowDTO.id
								})}
						>
							<Trash class="dark:text-white" />
						</Button>
					{/if}
				</div>
			</div>
		</span>
	</div>
{/snippet}

<Card class={className} headerText={headerTitle} headerSnippet={canEdit && headerSnippet}>
	<div class="flex flex-col gap-2 w-full overflow-y-auto max-h-[30rem] p-3">
		{#if rows.length > 0}
			{#each rows as row}
				{@render rowSnippet(row)}
			{/each}
		{:else}
			Nėra įrašų
		{/if}
	</div>
</Card>
