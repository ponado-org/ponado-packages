<script lang="ts">
	import * as Menubar from '$scn/menubar/index.js';
	import { Button } from '$scn/button/index.js';
	import { ThemeToggle } from '$ponado-ui/theme-toggle/index.js';
	import { LogOut, UserRound } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import { Badge } from '$scn/badge/index.js';
	import type { BadgeProps, UserInfo } from '$ponado-ui/shared-types.js';

	interface Props {
		user: UserInfo;
		onLogout: () => Promise<void>;
		badges: BadgeProps[];
		appVersion?: string;
	}

	let { user, onLogout, badges, appVersion }: Props = $props();
</script>

<Menubar.Menu>
	<Menubar.Trigger>
		<div class="flex items-center gap-5">
			<!-- <span class="hidden lg:flex"> -->
			<!-- 	{user.name[0] ?? 'noname'} -->
			<!-- </span> -->
			<UserRound />
		</div>
	</Menubar.Trigger>
	<Menubar.Content>
		<Menubar.Item>
			{#snippet child({ props })}
				<div {...props}>
					{user.firstName}
					{user.lastName}
				</div>
			{/snippet}
		</Menubar.Item>
		<Menubar.Item>
			{#snippet child({ props })}
				<div {...props}>{user.email}</div>
			{/snippet}
		</Menubar.Item>
		<Menubar.Item>
			{#snippet child({ props })}
				<div
					{...props}
					class={cn(props?.class!, 'lg:max-w-auto flex  w-auto max-w-[15rem] flex-wrap  gap-1 p-2')}
				>
					{#each badges as badge (badge.text)}
						<Badge variant={badge.variant}>{badge.text}</Badge>
					{/each}
				</div>
			{/snippet}
		</Menubar.Item>
		<Menubar.Item>
			{#snippet child({ props })}
				<div {...props} class="flex items-center gap-2">
					<Button class="flex-1" variant="outline" onclick={onLogout}>
						<p>Atsijungti</p>
						<LogOut color="red" />
					</Button>
					<ThemeToggle />
				</div>
			{/snippet}
		</Menubar.Item>
		<Menubar.Item disabled>
			{#snippet child({ props })}
				<div
					{...props}
					class={cn(props?.class!, 'flex w-full items-center justify-center text-muted-foreground')}
				>
					v. {appVersion}
				</div>
			{/snippet}
		</Menubar.Item>
	</Menubar.Content>
</Menubar.Menu>
