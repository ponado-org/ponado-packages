<script lang="ts">
	import { Badge } from "$scn/badge/index.js";
	import type { BadgeProps } from "$ponado-ui/shared-types.js";

	interface Props {
		wrap?: boolean;
		badges: BadgeProps[];
	}

	const { badges, wrap = false }: Props = $props();
</script>

<div class={`flex gap-1 h-fit ${wrap ? "flex-wrap" : "flex-nowrap"}`}>
	{#each badges as badge}
		<Badge variant={badge.variant}>{badge.text}</Badge>
	{/each}
</div>
