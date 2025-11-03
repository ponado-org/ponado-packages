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
	<div class="flex w-full flex-1 items-center gap-3 rounded-md border-b py-3">
		<span class="flex min-w-0 flex-1 flex-col gap-2">
			<div class="flex min-w-0 gap-2">
				<p class="flex-shrink-0 text-nowrap">{rowDTO?.date?.toLocaleDateString('lt') ?? ''}</p>
				<p title={rowDTO.title} class=" min-w-0 flex-1">{rowDTO.title}</p>
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<BadgeGroup wrap badges={rowDTO.badges} />

				<div class="ml-auto lg:hidden">
					<DropdownMenu items={getDropdownItems(rowDTO)} />
				</div>

				<div class="ml-auto hidden flex-shrink-0 flex-col items-center lg:flex lg:flex-row">
					{#if showFileOptions && rowDTO.fileId}
						<DocumentLink variant="outline" fileId={rowDTO.fileId} />
						<DocumentLink variant="outline" fileId={rowDTO.fileId} isDownload />
					{/if}

					{#if rowDTO.registrationType === RegistrationType.EXTERNAL && !rowDTO.isLocked && canEdit}
						<Button
							variant="outline"
							class="size-8 dark:text-white"
							href={`${resourceUrl}/${rowDTO.id}/edit`}
						>
							<Pencil class="dark:text-white" />
						</Button>
						<Button
							variant="destructive"
							class="size-8 dark:text-white"
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
	<div class="flex max-h-[30rem] w-full flex-col gap-2 overflow-y-auto p-3">
		{#if rows.length > 0}
			{#each rows as row }
				{@render rowSnippet(row)}
			{/each}
		{:else}
			Nėra įrašų
		{/if}
	</div>
</Card>
