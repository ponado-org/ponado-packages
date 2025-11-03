<script lang="ts">
	import { Button } from '$scn/button/index.js';
	import { ArrowLeft, ArrowRight } from '@lucide/svelte';
	import { DateInput } from '$ponado-ui/filters/date-input/index.js';

	interface Props {
		startDate: Date;
		endDate: Date;
	}

	let { startDate = $bindable(), endDate = $bindable() }: Props = $props();

	export function getNextMonth(start: Date): [Date, Date] {
		const nextMonth = new Date(start);
		nextMonth.setMonth(start.getMonth() + 1); // Set to next month

		const startDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1); // Set to first day of next month
		const endDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0); // Set to last day of next month
		return [startDate, endDate];
	}

	export function getPrevMonth(start: Date): [Date, Date] {
		const nextMonth = new Date(start);
		nextMonth.setMonth(start.getMonth() - 1); // Set to next month

		const startDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1); // Set to first day of next month
		const endDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0); // Set to last day of next month
		return [startDate, endDate];
	}

	function next() {
		[startDate, endDate] = getNextMonth(startDate);
	}

	function prev() {
		[startDate, endDate] = getPrevMonth(startDate);
	}
</script>

<span class="min-w-[250px]">
	<DateInput bind:value={startDate} />
</span>

<div class="flex w-full gap-3">
	<Button onclick={prev} variant="outline" class="flex-1">
		<ArrowLeft />
	</Button>
	<Button onclick={next} variant="outline" class="flex-1">
		<ArrowRight />
	</Button>
</div>

<span class="min-w-[250px]">
	<DateInput bind:value={endDate} />
</span>
