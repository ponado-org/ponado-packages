<script lang="ts">
	import { Button } from "$scn/button/index.js";
	import { Label } from "$scn/label/index.js";
	import { cn } from "$lib/utils.js";
	import { useId } from "bits-ui";
	import { onMount } from "svelte";
	import { ClassInputButtons } from "$ponado-ui/shared-types.js";

	interface Props {
		label: string;
		onValueChange?: (e: any) => void;
		value: number[];
	}

	let { value = $bindable([]), onValueChange, label }: Props = $props();

	let previewItems: number[] = $state([]);
	let shiftPressed = $state(false);
	let lastSelected: number | null = $state(null);
	let hoverIndex: number | null = $state(null);

	function toggleClass(classNum: number) {
		if (shiftPressed && lastSelected !== null) {
			// Handle shift click by selecting range
			const start = Math.min(lastSelected, classNum);
			const end = Math.max(lastSelected, classNum);
			const range = Array.from(
				{ length: end - start + 1 },
				(_, i) => start + i,
			);

			// Determine if we're deselecting or selecting based on preview items
			const isDeselecting = previewItems.every((x) =>
				value.includes(x),
			);

			if (isDeselecting) {
				// Remove range from selection
				value = value.filter((v) => !range.includes(v));
			} else {
				// Add range to selection (avoid duplicates)
				const newItems = range.filter(
					(v) => !value.includes(v),
				);
				value = [...value, ...newItems];
			}
		} else {
			// Normal toggle behavior
			if (value.includes(classNum)) {
				value = value.filter((v) => v !== classNum);
			} else {
				value = [...value, classNum];
			}
			lastSelected = classNum;
		}
		onValueChange && onValueChange(value);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Shift") {
			shiftPressed = true;
		}
	}

	function handleKeyUp(event: KeyboardEvent): void {
		if (event.key === "Shift") {
			shiftPressed = false;
			previewItems = [];
		}
	}

	function handleMouseEnter(index: number) {
		hoverIndex = index;
		updatePreview();
	}

	function updatePreview() {
		if (
			shiftPressed &&
			lastSelected !== null &&
			hoverIndex !== null
		) {
			const start = Math.min(lastSelected, hoverIndex);
			const end = Math.max(lastSelected, hoverIndex);
			previewItems = Array.from(
				{ length: end - start + 1 },
				(_, i) => classes[start + i],
			);
		}
	}

	function handleMouseLeave(): void {
		hoverIndex = null;
		if (!shiftPressed) {
			previewItems = [];
		}
	}

	onMount(() => {
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	});

	const classes = Array.from(
		{ length: ClassInputButtons.length },
		(_, i) => i + 1,
	);
	const id = useId();
</script>

<div class="form-input">
	<Label for={id}>{label}</Label>
	<div class="grid grid-cols-6 gap-1">
		{#each ClassInputButtons as classInput, index}
			<Button
				onmouseenter={() =>
					handleMouseEnter(classInput.value - 1)}
				onmouseleave={handleMouseLeave}
				type="button"
				variant="ghost"
				class={cn(
					"border",
					"text-lg",
					index === 0
						? "col-span-2"
						: "col-span-1",
					previewItems.includes(
						classInput.value,
					) && "bg-accent dark:bg-primary/50",
					value.includes(classInput.value) &&
						"bg-primary/90 text-white hover:text-white hover:bg-primary/80",
				)}
				onclick={() => toggleClass(classInput.value)}
			>
				{classInput.label}
			</Button>
		{/each}
	</div>
</div>
