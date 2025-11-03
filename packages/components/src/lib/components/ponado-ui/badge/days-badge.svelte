<script lang="ts">
	import { Badge, type BadgeVariant } from '$scn/badge/index.js';
	import { getDifferenceInDays, normalizeToUTC, prettyDaysDifference } from '@ponado/date-utils';

	interface Props {
		date: Date;
		startDate?: Date;
		isSuspended?: boolean;
		isHistory?: boolean;
		key?: any;
	}

	//const { key, date, isSuspended, startDate, isHistory }: newProps = $props();
	const { date, isSuspended, startDate, isHistory }: Props = $props();

	const today = normalizeToUTC(new Date());

	let variant: BadgeVariant = $state('green');
	let text = $state('Aktyvus');

	//effect needed to work in paginated tables, because tanstack caches rows
	$effect(() => {
		const diffInDays = getDifferenceInDays(date, today);

		const notStarted = startDate ? normalizeToUTC(new Date()) < startDate : null;

		if (isHistory) {
			variant = 'orange';
			text = prettyDaysDifference(-diffInDays);
		} else if (isSuspended) {
			variant = 'orange';
			text = 'Sustabdytas';
		} else if (notStarted) {
			variant = 'blue';
			text = 'Neprasidėjęs';
		} else if (diffInDays <= 0) {
			variant = 'gray';
			text = 'Nebegalioja';
		} else {
			variant = 'green';
			if (diffInDays < 30) {
				variant = 'red';
				text = diffInDays.toString() + ' dien.';
			} else if (diffInDays < 365) {
				text = Math.floor(diffInDays / 30).toString() + ' mėn.';
				variant = 'lime';
			} else {
				text = Math.floor(diffInDays / 365).toString() + ' met.';
			}
		}
	});
</script>

<Badge {variant}>
	{text}
</Badge>
