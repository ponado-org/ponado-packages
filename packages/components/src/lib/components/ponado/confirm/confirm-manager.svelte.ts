interface ConfirmState {
	open: boolean;
	title: string | null;
	description: string | null;
	onAccept: (() => void) | null;
	resolver: ((value: boolean) => void) | null;
}

const defaultConfirmation: ConfirmState = {
	open: false,
	onAccept: null,
	description: null,
	title: null,
	resolver: null
};

class ConfirmationManager {
	public props = $state(defaultConfirmation);
	#open = $state(false);

	private showConfirmation(title: string, description?: string): Promise<boolean> {
		return new Promise((resolve) => {
			this.#open = true;
			this.props.open = true;
			this.props.title = title;
			this.props.description = description || null;
			this.props.resolver = resolve;
		});
	}

	// Call this when user clicks "Accept/OK"
	onAccept = () => {
		this.#open = false;
		this.props.open = false;
		this.props.resolver?.(true); // Resolve with true
		this.props.resolver = null;
	};

	// Call this when user clicks "Cancel" or closes dialog
	onCancel = () => {
		this.#open = false;
		this.props.open = false;
		this.props.resolver?.(false); // Resolve with false
		this.props.resolver = null;
	};

	async confirm(title: string, description?: string): Promise<boolean> {
		return this.showConfirmation(title, description);
	}

	get open() {
		return this.#open;
	}
}

const confirmManager = new ConfirmationManager()

async function customConfirm(title: string, description?: string): Promise<boolean> {
	return confirmManager.confirm(title, description);
}

export { confirmManager, customConfirm }

