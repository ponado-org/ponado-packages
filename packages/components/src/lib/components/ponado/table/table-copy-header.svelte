<script lang="ts">
	import { Button } from "$scn/button/index.js";
	import { Tooltip } from "$ponado-ui/tooltip/index.js";
	import { Clipboard } from "@lucide/svelte";

	interface SortingHeaderProps {
		title: string;
		onclick: () => void;
	}

	let { title, onclick }: SortingHeaderProps = $props();
</script>

<Tooltip text="Kopijuoti atrinktus pašto adresus į iškarptinę">
	<Button variant="ghost" {onclick}>
		{title}
		<Clipboard class="dark:text-white" />
	</Button>
</Tooltip>
