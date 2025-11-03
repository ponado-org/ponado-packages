<script lang="ts">
	import { Label } from "$scn/label/index.js";
	import { Switch } from "$scn/switch/index.js";
	import { cn } from "$lib/utils.js";
	import { useId } from "bits-ui";
	import { type SwitchProps } from "$ponado-ui/shared-types.js";
	import { Tooltip } from "$ponado-ui/tooltip/index.js";

	let {
		checked = $bindable(false),
		description,
		icon,
		label,
		onchange,
		class: className,
	}: SwitchProps = $props();

	const id = useId();
</script>

<div class={cn("flex items-center flex-col gap-3 ", className)}>
	<div class="flex items-center gap-3">
		{#if icon}
			<svelte:component this={icon} />
		{/if}
		<Switch {id} bind:checked {onchange} />

		{#if label}
			<Label for={id}>{label}</Label>
		{/if}
		{#if description}
			<Tooltip text={description} />
			<!-- <p class="text-muted-foreground text-sm"> -->
			<!-- 	{description} -->
			<!-- </p> -->
		{/if}
	</div>
</div>
