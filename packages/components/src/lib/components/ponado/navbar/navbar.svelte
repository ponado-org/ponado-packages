<script lang="ts">
	import * as Menubar from "$scn/menubar/index.js";

	import type {
		BadgeProps,
		NavbarMenu,
		UserInfo,
	} from "$ponado-ui/shared-types.js";
	import { getVisibleMenus } from "./navbar-utils.js";
	import { NavbarUserMenu, NavbarMenuItem } from "./index.js";

	interface Props {
		user: UserInfo;
		badges: BadgeProps[];
		getNavbarConfig: (user: UserInfo) => NavbarMenu[];
		handleSignOut: () => Promise<void>;
	}

	let { user, badges, handleSignOut, getNavbarConfig }: Props = $props();

	const handleLogout = async () => {
		try {
			await handleSignOut();
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	const navbarConf = getNavbarConfig(user);
	const visibleMenus = user && getVisibleMenus(navbarConf, user);
</script>

{#if user}
	<div class="flex items-center justify-center gap-2 mb-10">
		<Menubar.Root>
			{#each visibleMenus as menu}
				<Menubar.Menu>
					<Menubar.Trigger class="text-nowrap"
						>{menu.trigger}</Menubar.Trigger
					>
					<Menubar.Content>
						{#each menu.items as item}
							<NavbarMenuItem
								{item}
								{user}
							/>
						{/each}
					</Menubar.Content>
				</Menubar.Menu>
			{/each}

			{#if user}
				<NavbarUserMenu
					{badges}
					{user}
					onLogout={handleLogout}
				/>
			{/if}
		</Menubar.Root>
	</div>
{/if}
