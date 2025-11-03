<script lang="ts">
	import type { NavbarItem, UserInfo } from "$ponado-ui/shared-types.js";
	import * as Menubar from "$scn/menubar/index.js";
	import { NavbarMenuItem } from "$ponado-ui/navbar/index.js";
	import { isItemVisible } from "./navbar-utils.js";

	interface Props {
		item: NavbarItem;
		user: UserInfo;
	}

	let { item, user }: Props = $props();
	const visible = isItemVisible(item, user);
</script>

{#if visible}
	{#if item.children}
		<Menubar.Sub>
			<Menubar.SubTrigger>{item.label}</Menubar.SubTrigger>
			<Menubar.SubContent>
				{#each item.children as child}
					<NavbarMenuItem item={child} {user} />
				{/each}
			</Menubar.SubContent>
		</Menubar.Sub>
	{:else}
		<Menubar.Item>
			{#snippet child({ props })}
				<a {...props} href={item.href}>{item.label}</a>
			{/snippet}
		</Menubar.Item>
	{/if}
{/if}
