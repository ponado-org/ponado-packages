<script lang="ts" generics="OType extends SelectOptionType">
	import * as Select from '$scn/select/index.js';
	import type { BadgeProps, SelectOptionType, SelectPropsBase } from '$ponado-ui/shared-types.js';
	import { BadgeGroup } from '$ponado-ui/badge/index.js';
	import { Label } from '$scn/label/index.js';
	import { useId } from 'bits-ui';

	let {
		name,
		options,
		class: className,
		triggerSnippet,
		value = $bindable(),
		onValueChange,
		multiple = false,
		wrap = false,
		placeholder,
		badges,
		label,
		...rest
	}: SelectPropsBase<OType> = $props();

	const id = useId();

	const getTrigerBadge = (v: any) => {
		let triggerBadges: BadgeProps[] = [];

		if (Array.isArray(value) && value.length > 0) {
			if (badges) {
				triggerBadges = value.map((x) => badges[x]);
			} else {
				triggerBadges = options
					.filter((o) => (value as OType[]).some((x) => x === o.value))
					.map((x) => ({
						text: x.label,
						variant: 'default'
					}));
			}
		} else if (typeof value === 'number' && value !== 0) {
			if (badges) {
				triggerBadges = [badges[value]];
			} else {
				triggerBadges = [
					{
						text: options.find((x) => x.value === value)?.label!,
						variant: 'default'
					}
				];
			}
		} else {
			triggerBadges = [{ variant: 'outline', text: 'Pasirinkti' }];
		}
		return triggerBadges;
	};
</script>

<div class="filter-field form-field">
	<Label class="text-nowrap" for={id}>{label}</Label>

	<Select.Root type={multiple ? 'multiple' : 'single'} bind:value {onValueChange} {name}>
		<Select.Trigger {placeholder} class="h-fit">
			{#if triggerSnippet}
				{@render triggerSnippet()}
			{:else}
				{@const trigBad = getTrigerBadge(value)}
				<BadgeGroup {wrap} badges={trigBad} />
			{/if}
		</Select.Trigger>

		<Select.Content>
			{#each options as option}
				<Select.Item value={option.value as any} label={option.label} />
			{/each}
		</Select.Content>
	</Select.Root>
</div>
