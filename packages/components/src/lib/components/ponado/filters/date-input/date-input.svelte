<script lang="ts">
	import * as Popover from "$scn/popover/index.js";
	import { Button } from "$scn/button/index.js";
	import { Calendar } from "$scn/calendar/index.js";
	import { Label } from "$scn/label/index.js";
	import { cn } from "$lib/utils.js";
	import { useId } from "bits-ui";

	import {
		CalendarDate,
		getLocalTimeZone,
		today,
		type DateValue,
	} from "@internationalized/date";

	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

	type Props = {
		value: Date | undefined;
		onValueChange?: (v: Date | undefined) => void;
		placeholder?: DateValue;
		label?: string;
		disabled?: boolean;
		class?: string;
		maxValue?: DateValue;
		minValue?: DateValue;
	};

	let {
		value = $bindable(),
		placeholder,
		label,
		onValueChange,
		maxValue = today(getLocalTimeZone()),
		disabled = false,
		minValue,
		class: className,
	}: Props = $props();

	let open = $state(false);
	const id = useId();

	function jsDateToCalendarDate(jsDate: Date): CalendarDate {
		return new CalendarDate(
			jsDate.getUTCFullYear(),
			jsDate.getUTCMonth() + 1, // CalendarDate months are 1-based
			jsDate.getUTCDate(),
		);
	}

	function calendarDateToJsDate(cd: CalendarDate): Date {
		// Construct a Date at midnight UTC
		return new Date(
			Date.UTC(cd.year, cd.month - 1, cd.day, 0, 0, 0, 0),
		);
	}

	// Convert JS Date to CalendarDate for the calendar component
	let calendarValue = $derived(() => {
		if (!value) return undefined;
		return jsDateToCalendarDate(value);
	});

	function handleValueChange(newCalendarDate: DateValue | undefined) {
		open = false; // Close popover

		if (newCalendarDate) {
			const jsDate = calendarDateToJsDate(
				newCalendarDate as CalendarDate,
			);
			value = jsDate;
		} else {
			value = undefined;
		}

		// Call the parent's onValueChange callback
		onValueChange?.(value);
	}
</script>

<div class={cn("input-field w-full", className)}>
	{#if label}
		<Label for="{id}-date" class="px-1">{label}</Label>
	{/if}
	<Popover.Root bind:open>
		<Popover.Trigger {disabled} id="{id}-date">
			{#snippet child({ props })}
				<Button
					{...props}
					variant="outline"
					class="justify-between font-normal"
				>
					{value
						? value.toLocaleDateString(
								"lt-LT",
							)
						: "Pasirinkite datą"}
					<ChevronDownIcon />
				</Button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content
			class="w-auto overflow-hidden p-0"
			align="start"
		>
			<Calendar
				type="single"
				{disabled}
				{placeholder}
				value={calendarValue()}
				onValueChange={handleValueChange}
				captionLayout="dropdown"
				locale="lt-LT"
				{maxValue}
				{minValue}
			/>
		</Popover.Content>
	</Popover.Root>
</div>
