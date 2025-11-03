<script lang="ts">
	import { Badge, type BadgeVariant } from '$scn/badge/index.js';

	const { variant, text }: { variant: BadgeVariant; text: string } = $props();
</script>

<div class="w-fit">
	<Badge {variant} class="w-fit">{text}</Badge>
</div>
