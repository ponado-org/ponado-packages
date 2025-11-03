<script lang="ts">
	import { Card } from '$ponado-ui/card';
	import { DispatchTypeBadges } from '$lib/enums/app';
	import BadgeGroup from '$ponado-ui/badge/badge-group.svelte';
	import type { ActiveDispatchDTO, PersonDashboardDTO } from '$lib/interfaces';

	interface Props {
		personDTO: PersonDashboardDTO;
		class: string;
	}

	const { personDTO, class: className }: Props = $props();
</script>

{#snippet RowSnippet(item: ActiveDispatchDTO)}
	{@const badges = [DispatchTypeBadges[item.type]]}
	<span class="flex flex-col lg:flex-row gap-2 flex flex-1 min-w-0 border rounded-md p-2">
		<BadgeGroup wrap {badges} />
		<p class="text-nowrap flex-shrink-0">
			{item.startDate.toLocaleDateString('lt')} - {item.endDate.toLocaleDateString('lt')}
		</p>

		<p title={item.locationTitle} class="truncate min-w-0 flex-1">{item.locationTitle}</p>
	</span>
{/snippet}

<Card class={className} headerText="Aktyvūs siuntimai">
	<div class="flex flex-col gap-2 w-full overflow-y-auto">
		{#if personDTO.activeDispatches.length > 0}
			{#each personDTO.activeDispatches as item}
				{@render RowSnippet(item)}
			{/each}
		{:else}
			Nėra įrašų
		{/if}
	</div>
</Card>
