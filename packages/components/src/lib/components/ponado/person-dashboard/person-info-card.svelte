<script lang="ts">
	import { Card } from '$ponado-ui/card';
	import { cn } from '$lib/utils';
	import type { PersonDashboardDTO } from '$lib/interfaces';
	import { Edit } from '@lucide/svelte';
	import { Button } from '$scn/button';

	type Base = {
		personDTO: PersonDashboardDTO;
		class?: string;
	};

	type Props =
		| (Base & {
				resourceUrl: string;
				canEdit: true;
		  })
		| (Base & {
				canEdit?: false;
				resourceUrl?: never;
		  });

	const { personDTO, class: className, resourceUrl, canEdit = false }: Props = $props();
</script>

{#snippet InfoField(label: string, value: string)}
	<div class="flex flex-col gap-1 border border-gray-500/20 rounded-md px-3 p-2">
		<span class="font-bold">{label}</span>
		<span class="">{value}</span>
	</div>
{/snippet}

{#snippet headerSnippet()}
	<Button variant="secondary" href={resourceUrl}>
		<p class="hidden lg:block">Redaguoti</p>
		<Edit class="size-8 dark:text-white" />
	</Button>
{/snippet}

<Card
	class="col-span-3 lg:col-span-1"
	headerText="Kontaktai"
	headerSnippet={canEdit && headerSnippet}
>
	<div class={cn(className, 'flex gap-1')}>
		{@render InfoField('Vardas', personDTO.personName)}
		{@render InfoField('Tel. nr', personDTO.phone ?? 'nėra')}
		{@render InfoField('El. paštas', personDTO.email ?? 'nėra')}
	</div>
</Card>
