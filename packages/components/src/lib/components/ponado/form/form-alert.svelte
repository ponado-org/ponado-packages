<script lang="ts">
	import type { AlertVariant } from "$scn/alert/index.js";
	import * as Alert from "$scn/alert/index.js";
	import { Info } from "@lucide/svelte";

	interface Props {
		title: string;
		icon?: any | null;
		description: string;
		variant?: AlertVariant;
	}

	const { title, description, variant, icon }: Props = $props();
</script>

<Alert.Root>
	{#if icon}
		<icon></icon>
	{:else}
		<Info />
	{/if}

	<Alert.Title>{title}</Alert.Title>
	<Alert.Description>{description}</Alert.Description>
</Alert.Root>
