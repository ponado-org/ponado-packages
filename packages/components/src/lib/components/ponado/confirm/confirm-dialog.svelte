<script lang="ts">
	import * as AlertDialog from "$scn/alert-dialog/index.js";

	type Props = {
		title: string;
		description?: string;
		open: boolean;
		onAccept: () => void;
		onCancel: () => void;
	};

	const { open, title, description, onAccept, onCancel }: Props =
		$props();
</script>

<AlertDialog.Root {open}>
	<AlertDialog.Content class="">
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			{#if description}
				<AlertDialog.Description
					>{description}</AlertDialog.Description
				>
			{/if}
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={onCancel}
				>Atšaukti</AlertDialog.Cancel
			>
			<AlertDialog.Action onclick={onAccept}
				>Taip</AlertDialog.Action
			>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
