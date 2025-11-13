import { toast } from 'svelte-sonner';
import z from 'zod';

export const RecordHistoryQuerySchema = z.object({
	relatedObjectType: z.number(),
	relatedObjectId: z.coerce.number()
});

type HistoryMetadata = {
	createdAt: Date | null;
	createdBy: string | null;
	updatedAt: Date | null;
	updatedBy: string | null;
};

interface DialogState {
	title: string | null;
	historyMetadata: HistoryMetadata | null | undefined;
}

const defaultState: DialogState = {
	title: null,
	historyMetadata: null
};

type TProps = z.infer<typeof RecordHistoryQuerySchema>;

type GetObjectHistoryFn = (props: TProps) => Promise<HistoryMetadata | null>;

export class RecordHistoryManager {
	#dialogState = $state(defaultState);
	#open = $state(false);
	#fetchHistory: GetObjectHistoryFn;

	constructor(fetcher: GetObjectHistoryFn) {
		this.#fetchHistory = fetcher;
	}

	openDialog = async (props: TProps) => {
		const r = await this.#fetchHistory(props);

		if (r) {
			this.#dialogState.historyMetadata = r;
			this.#open = true;
		} else {
			toast.error('Nepavyko gauti įrašo istorijos');
		}
	};

	onOpenChangeComplete = (state: boolean) => {
		if (!state) this.#open = false;
	};

	get open() {
		return this.#open;
	}

	get dialogState() {
		return this.#dialogState;
	}
}
