<script lang="ts">
	import * as Accordion from "$scn/accordion/index.js";
	import { Button } from "$scn/button/index.js";
	import { Funnel, FunnelX } from "@lucide/svelte";
	import type { Snippet } from "svelte";

	interface Props {
		clearFilter: () => void;
		children: Snippet;
	}

	const { children, clearFilter }: Props = $props();
</script>

<div class="mt-9 hidden h-fit w-[20rem] flex-col 2xl:flex">
	<h1 class="font-semibold mb-2 text-xl flex items-center gap-3">
		<Funnel />
		<p>Filtras</p>
	</h1>
	<div class="space-y-3 border rounded-md p-3">
		{@render children()}
		<Button
			class="w-full space-x-1"
			variant="outline"
			onclick={clearFilter}
		>
			<FunnelX />
			<p class="text-base">Panaikinti filtrą</p>
		</Button>
	</div>
</div>

<Accordion.Root class="h-fit rounded-md p-3 2xl:hidden" type="single">
	<Accordion.Item value="item-1">
		<Accordion.Trigger class="lg:text-xl font-semibold">
			<div class="flex space-x-1">
				<Funnel />
				<p>Filtras</p>
			</div>
		</Accordion.Trigger>
		<Accordion.Content>
			<div class="">
				{@render children()}
				<Button
					variant="secondary"
					class="my-5 w-full"
					onclick={clearFilter}
				>
					<FunnelX />
					<p>Panaikinti filtrą</p>
				</Button>
			</div>
		</Accordion.Content>
	</Accordion.Item>
</Accordion.Root>
