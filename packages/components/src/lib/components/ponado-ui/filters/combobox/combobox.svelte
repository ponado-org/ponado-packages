<script module lang="ts">
	const variantMap: Record<SizeVariant, ClassValue> = {
		sm: 'sm:min-w-[15rem]',
		md: 'sm:min-w-[20rem]',
		lg: 'sm:min-w-[25rem]',
		xl: 'sm:min-w-[30rem]',
		'2xl': 'lg:min-w-[35rem]'
	};
</script>

<script lang="ts" generics="OType extends SelectOptionType">
	import * as Command from '$scn/command/index.js';
	import * as Popover from '$scn/popover/index.js';
	import { buttonVariants } from '$scn/button/index.js';
	import { Label } from '$scn/label/index.js';
	import { Badge } from '$scn/badge/index.js';
	import { cn } from '$lib/utils.js';
	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import { onMount, tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { SelectOptionType, SelectPropsBase, SizeVariant } from '$ponado-ui/shared-types.js';
	import type { BadgeProps } from '$ponado-ui/shared-types.js';
	import { BadgeGroup } from '$ponado-ui/badge/index.js';
	import type { ClassValue } from 'tailwind-variants';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	let {
		options,
		disabled,
		name,
		value = $bindable(),
		multiple = false,
		truncate = false,
		sizeVariant = 'md',
		wrap = false,
		onValueChange,
		triggerSnippet,
		popoverClass,
		class: className,
		badges,
		placeholder,
		label,
		...restProps
	}: HTMLSelectAttributes & SelectPropsBase<OType> = $props();

	let selectedOptions = new SvelteMap<OType, string>();
	let open = $state(false);

	onMount(() => {
		if (multiple === true && Array.isArray(value)) {
			// Multiple select prefill
			value.forEach((v) => {
				const item = options?.find((x) => x.value === v)!;
				if (item) selectedOptions.set(item.value, item.label);
			});
		} else if (
			multiple === false &&
			value !== null &&
			value !== undefined &&
			!Array.isArray(value)
		) {
			// Single select prefill (only if value is not array)
			const item = options?.find((x) => x.value === value)!;

			if (item) {
				selectedOptions.set(item.value, item.label);
			}
		}
	});

	$effect(() => {
		if (!value || (Array.isArray(value) && value.length === 0)) {
			selectedOptions.clear();
		}
	});

	let triggerRef = $state<HTMLButtonElement>(null!);

	// We want to refocus the trigger button when the user selects
	// an item from the list so users can continue navigating the
	// rest of the form with the keyboard.
	function closeAndFocusTrigger() {
		if (!multiple) {
			open = false;
			tick().then(() => {
				triggerRef.focus();
			});
		}
	}

	function updateValue(itemValue: OType) {
		if (multiple === true) {
			// Multiple selection mode
			if (selectedOptions.has(itemValue)) {
				selectedOptions.delete(itemValue);
			} else {
				selectedOptions.set(itemValue, options.find((x) => x.value === itemValue)!.label);
			}
			value = Array.from(selectedOptions.keys()) as any; // keep array type only for multiple
		} else {
			// Single selection mode
			if (selectedOptions.has(itemValue)) {
				selectedOptions.clear();
				value = null as any;
			} else {
				selectedOptions.clear();
				selectedOptions.set(itemValue, options.find((x) => x.value === itemValue)!.label);
				value = itemValue as any;
			}
		}

		if (onValueChange) {
			onValueChange(value);
		}
	}

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

<Popover.Root bind:open>
	<div class={cn('input-field', className)}>
		{#if label}
			<Label>{label}</Label>
		{/if}
		<Popover.Trigger
			bind:ref={triggerRef}
			{disabled}
			class={cn(
				buttonVariants({ variant: 'outline' }),
				'justify-between',
				'px-4',
				'truncate',
				'h-auto',
				!value && 'text-muted-foreground'
			)}
			role="combobox"
			aria-expanded={open}
		>
			<div class={cn('flex flex-1 items-start justify-between')}>
				{#if !value || (Array.isArray(value) && value.length === 0)}
					<Badge variant="outline">{placeholder ?? 'Pasirinkti'}</Badge>
				{:else if Array.isArray(value) && truncate}
					{@const label = options.find((x) => x.value === value[value.length - 1])?.label}
					<div class="flex w-full justify-start">
						<Badge>{label}</Badge>
					</div>
					<Badge variant="outline">+{value.length}</Badge>
				{:else}
					{@const trigBad = getTrigerBadge(value)}
					<BadgeGroup {wrap} badges={trigBad} />
				{/if}

				<ChevronsUpDown class="opacity-50 dark:text-white" />
			</div>
		</Popover.Trigger>
	</div>

	<Popover.Content class={cn('min-w-[22rem]', variantMap[sizeVariant], popoverClass)}>
		<Command.Root class="">
			<Command.Input autofocus {placeholder} class="h-9 w-full" />
			<Command.Empty>Nėra pasirinkimų</Command.Empty>
			<Command.Group class="max-h-80 w-full overflow-auto">
				{#each options as item}
					<Command.Item
						onSelect={() => {
							updateValue(item.value);
							closeAndFocusTrigger();
						}}
					>
						<span class=" truncate whitespace-nowrap">
							{item.label}
						</span>
						<Check class={cn('ml-auto', !selectedOptions.has(item.value) && 'text-transparent')} />
					</Command.Item>
				{/each}
			</Command.Group>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
