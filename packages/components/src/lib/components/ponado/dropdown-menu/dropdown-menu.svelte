<script lang="ts">
	import { Button } from "$scn/button/index.js";
	import * as DropdownMenu from "$scn/dropdown-menu/index.js";
	import { Ellipsis } from "$scn/pagination/index.js";
	import type { DropdownItemProps } from "./index.js";
	import { cn } from "$lib/utils.js";

	type props = {
		items: DropdownItemProps[];
	};

	const { items }: props = $props();

	const baseClass = "w-full";
</script>

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
		{#each items as item}
			{#if item.condition !== false}
				{#if item.type === "a"}
					<DropdownMenu.Item>
						{#snippet child({ props })}
							<a
								{...props}
								href={item.href}
								target={item.target}
							>
								<!-- {#if item.icon} -->
								<!-- 	<svelte:component this={item.icon} class={item.iconClass ?? 'mr-2 h-4 w-4'} /> -->
								<!-- {/if} -->
								{item.label}
							</a>
						{/snippet}
					</DropdownMenu.Item>
				{:else if item.type === "button"}
					<DropdownMenu.Item>
						{#snippet child({ props })}
							<button
								{...props}
								onclick={() =>
									item?.onclick?.()}
								class={cn(
									props.class ??
										"",
									baseClass,
								)}
							>
								{item.label}
								{#if item.icon}
									<svelte:component
										this={item.icon}
										class={item.iconClass ??
											"mr-2 h-4 w-4"}
									/>
								{/if}
							</button>
						{/snippet}
					</DropdownMenu.Item>
				{/if}
			{/if}
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
