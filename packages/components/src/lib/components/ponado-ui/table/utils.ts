import { invalidateAll } from '$app/navigation';
import { customConfirm } from '$lib/managers/confirmationManager.svelte';
import { toast } from 'svelte-sonner';

export async function handleDelete(props: {
	endpoint: string;
	id: number;
	invalidateAfterDelete?: boolean;
}) {
	const invalidateAfterDelete = props.invalidateAfterDelete ?? true;

	if (await customConfirm('Ar tikrai norite pašalinti?')) {
		const response = await fetch(`${props.endpoint}/${props.id}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			toast.success('Įrašas sėkmingai pašalintas');
			invalidateAfterDelete && invalidateAll();
		} else {
			const r = await response.json();
			toast.warning(r.error);
		}
	}
}
