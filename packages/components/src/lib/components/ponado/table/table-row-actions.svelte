<script lang="ts">
	import { Button } from "$scn/button/index.js";
	import { invalidateAll } from "$app/navigation";
	import { toast } from "svelte-sonner";
	import * as DropdownMenu from "$scn/dropdown-menu/index.js";
	import { Ellipsis } from "$scn/pagination/index.js";
	import { Trash } from "@lucide/svelte";
	import type {
		ActionLink,
		ActionButton,
		TableRowActionProps,
	} from "./types.js";
	import { customConfirm } from "../confirm/index.js";

	const {
		id,
		relatedObjectType,
		recordHistoryManager,
		resourcePath,
		links = [],
		buttons = [],
		showDelete = true,
		deleteLabel = "Pašalinti",
		historyLabel = "Rodyti istorija",
		invalidateAfterDelete = true,
	}: TableRowActionProps = $props();

	// Default edit link if editPath is provided
	const defaultLinks: ActionLink[] =
		// Combine default and custom links
		resourcePath ? [] : [];

	const allLinks = $derived.by(() => {
		const editLink: ActionLink[] = [];
		if (resourcePath) {
			editLink.push({
				href: `${resourcePath}/${id}/edit`,
				label: "Redaguoti",
			});
		}
		return [...editLink, ...links];
	});

	// Default history button
	const defaultButtons: ActionButton[] = [];

	if (relatedObjectType) {
		defaultButtons.push({
			label: historyLabel,
			onclick: () =>
				recordHistoryManager.openDialog({
					relatedObjectType,
					relatedObjectId: id,
				}),
		});
	}

	export async function handleDelete(props: {
		endpoint?: string | null;
		id: number;
		invalidateAfterDelete?: boolean;
	}) {
		if (!props.endpoint) {
			console.warn(
				"No endpoint provided, so delete operation will not be executed",
			);
			return;
		}

		const invalidateAfterDelete =
			props.invalidateAfterDelete ?? true;

		if (await customConfirm("Ar tikrai norite pašalinti?")) {
			const response = await fetch(
				`${props.endpoint}/${props.id}`,
				{ method: "DELETE" },
			);

			if (response.ok) {
				toast.success("Įrašas sėkmingai pašalintas");
				invalidateAfterDelete && invalidateAll();
			} else {
				const r = await response.json();
				toast.warning(r.error);
			}
		}
	}
	// Default delete button
	if (showDelete) {
		defaultButtons.push({
			label: deleteLabel,
			onclick: () =>
				handleDelete({
					endpoint: resourcePath,
					id,
					invalidateAfterDelete,
				}),
			icon: Trash,
			iconClass: "ml-auto text-red-500",
		});
	}

	// Combine default and custom buttons
	const allButtons = [...buttons, ...defaultButtons];
</script>

{#snippet DropdownLink(link: ActionLink)}
	{#if link.condition !== false}
		<DropdownMenu.Item>
			{#snippet child({ props })}
				<a
					{...props}
					href={link.href}
					target={link.target}>{link.label}</a
				>
			{/snippet}
		</DropdownMenu.Item>
	{/if}
{/snippet}

{#snippet DropdownButton(button: ActionButton)}
	{#if button.condition !== false}
		<DropdownMenu.Item
			class={button.class}
			onclick={button.onclick}
		>
			{#if button.icon}
				<p>{button.label}</p>
				<svelte:component
					this={button.icon}
					class={button.iconClass}
				/>
			{:else}
				<button>{button.label}</button>
			{/if}
		</DropdownMenu.Item>
	{/if}
{/snippet}

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				size="sm"
				class="h-6 w-8"
				variant="ghost"
			>
				<span class="sr-only">Open menu</span>
				<Ellipsis class="" />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content>
		{#key resourcePath ?? "" + id}
			{#each allLinks as link (link.href)}
				{@render DropdownLink(link)}
			{/each}

			{#each allButtons as button}
				{@render DropdownButton(button)}
			{/each}
		{/key}
	</DropdownMenu.Content>
</DropdownMenu.Root>
