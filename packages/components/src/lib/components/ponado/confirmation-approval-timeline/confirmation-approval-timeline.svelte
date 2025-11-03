<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { Church, Cross, PersonStanding } from "@lucide/svelte";

	interface Props {
		class?: string;
	}

	const steps = [
		{
			value: 1,
			label: "Katechetas",
			icon: PersonStanding,
			range: "09-01 - 11-01",
			startDate: new Date(new Date().getFullYear(), 8, 1),
			endDate: new Date(new Date().getFullYear(), 10, 1),
		},
		{
			value: 2,
			label: "Su klebono rekomendacija",
			icon: Church,
			range: "11-01 - 12-01",
			startDate: new Date(new Date().getFullYear(), 10, 1),
			endDate: new Date(new Date().getFullYear(), 11, 1),
		},
		{
			value: 3,
			label: "Su vyskupo rekomendacija",
			icon: Cross,
			range: "12-01 - 07-31",
			startDate: new Date(new Date().getFullYear(), 11, 1),
			endDate: new Date(new Date().getFullYear() + 1, 6, 31),
		},
	];

	function calculateProgress(): number {
		const now = new Date();
		let totalProgress = 0;

		for (let i = 0; i < steps.length; i++) {
			const step = steps[i];

			if (now < step.startDate) {
				// Haven't reached this step yet
				break;
			} else if (
				now >= step.startDate &&
				now <= step.endDate
			) {
				// Currently in this step - calculate partial progress
				const stepDuration =
					step.endDate.getTime() -
					step.startDate.getTime();
				const elapsed =
					now.getTime() -
					step.startDate.getTime();
				const stepProgress = Math.min(
					elapsed / stepDuration,
					1,
				);
				totalProgress = i + stepProgress;
				break;
			} else {
				// Step is completed
				totalProgress = i + 1;
			}
		}

		// Convert to percentage (0-100)
		return (totalProgress / (steps.length - 1)) * 100;
	}

	function isStepActive(index: number): boolean {
		const now = new Date();
		const step = steps[index];
		return now >= step.startDate && now <= step.endDate;
	}

	function isStepCompleted(index: number): boolean {
		const now = new Date();
		return now > steps[index].endDate;
	}

	const progressPercentage = calculateProgress();
	const { class: className }: Props = $props();
</script>

<div class="max-w-[30rem] w-[80%] flex flex-col items-center gap-3 h-[8rem]">
	<span>Nario registracijos terminai:</span>
	<div
		class={cn(
			"relative h-3 bg-gray-500/20 border rounded-full w-full",
			className,
		)}
	>
		<!-- Connecting progress bar with smooth gradient progress -->
		<div
			class="absolute h-3 bg-primary/80 rounded-full transition-all duration-500"
			style={`width: ${progressPercentage}%;`}
		></div>

		<!-- Step Dots -->
		{#each steps as step, index}
			{@const active = isStepActive(index)}
			{@const completed = isStepCompleted(index)}
			<div
				class={cn(
					"size-5 rounded-full absolute -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 text-center transition-colors duration-300",
					completed
						? "bg-primary"
						: active
							? "bg-primary ring-2 ring-primary/30 ring-offset-2"
							: "bg-gray-400",
				)}
				style={`left: ${(index / (steps.length - 1)) * 100}%`}
				title={step.label}
			>
				<div
					class="absolute top-7 flex flex-col items-center left-1/2 -translate-x-1/2 text-sm text-center"
				>
					<step.icon />
					<div
						class="text-nowrap hidden md:block font-medium"
					>
						{step.label}
					</div>
					<div
						class="text-nowrap text-xs text-gray-600"
					>
						{step.range}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
