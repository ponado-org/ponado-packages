import type { BadgeProps, SelectOption } from "../types";

export const badgeVariants = {
	base: 'select-none focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3',
	variants: {
		variant: {
			green: 'dark:bg-green-400/30 bg-green-400/30 hover:bg-green-300/50 border-transparent',
			blue: 'dark:bg-blue-400/30 bg-blue-200/80  hover:bg-blue-400/40 border-transparent',
			purple: 'dark:bg-purple-400/30 bg-purple-200/80  hover:bg-purple-300/80 border-transparent',
			yellow: 'dark:bg-yellow-400/30 bg-yellow-200/80  hover:bg-yellow-300/80 border-transparent',
			violet: 'dark:bg-violet-400/30 bg-violet-200/80  hover:bg-violet-300/80 border-transparent',
			fuchsia:
				'dark:bg-fuchsia-400/30 bg-fuchsia-300  hover:bg-fuchsia-300/80 border-transparent',

			'yellow-outline':
				'dark:bg-yellow-400/30 bg-yellow-100  hover:bg-yellow-100/80 border border-yellow-700 border-dashed',

			'fuchsia-outline':
				'dark:bg-fuchsia-400/30 bg-fuchsia-100  hover:bg-fuchsia-100/80 border border-fuchsia-700 border-dashed',

			'blue-outline':
				'dark:bg-blue-400/30  bg-blue-100 hover:bg-blue-400/40 border border-blue-700 border-dashed',

			'purple-outline':
				'dark:bg-purple-400/30 bg-purple-100  hover:bg-purple-100/80 border border-purple-700 border-dashed',

			'red-outline':
				'dark:bg-red-400/30 bg-red-100  hover:bg-red-100/80 border border-red-700 border-dashed',

			'lime-outline':
				'dark:bg-lime-400/30 bg-lime-100  hover:bg-lime-400/50 border border-lime-700 dark:border-lime-600 border-dashed',

			'orange-outline':
				'dark:bg-orange-400/30 bg-orange-100  hover:bg-orange-400/40 border border-orange-700 border-dashed',

			lime: 'dark:bg-lime-400/30 bg-lime-200/80  hover:bg-lime-300/80 border-transparent',
			red: 'dark:bg-red-400/30 bg-red-200/80  hover:bg-red-300/80 border-transparent',
			gray: 'dark:bg-gray-400/30 bg-gray-200/80  hover:bg-gray-300/80 border-transparent',
			orange: 'dark:bg-orange-400/30 bg-orange-200/80  hover:bg-orange-400/40 border-transparent',

			// New variants
			teal: 'dark:bg-teal-400/30 bg-teal-200/80 hover:bg-teal-300/80 border-transparent',
			pink: 'dark:bg-pink-400/30 bg-pink-200/80 hover:bg-pink-300/80 border-transparent',
			indigo: 'dark:bg-indigo-400/30 bg-indigo-200/80 hover:bg-indigo-300/80 border-transparent',
			cyan: 'dark:bg-cyan-400/30 bg-cyan-200/80 hover:bg-cyan-300/80 border-transparent',
			amber: 'dark:bg-amber-400/30 bg-amber-200/80 hover:bg-amber-300/80 border-transparent',
			rose: 'dark:bg-rose-400/30 bg-rose-200/80 hover:bg-rose-300/80 border-transparent',
			sky: 'dark:bg-sky-400/30 bg-sky-200/80 hover:bg-sky-300/80 border-transparent',
			emerald:
				'dark:bg-emerald-400/30 bg-emerald-200/80 hover:bg-emerald-300/80 border-transparent',

			ghost: 'hover:bg-accent hover:text-accent-foreground',
			default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90 border-transparent',
			secondary:
				'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 border-transparent',
			destructive:
				'bg-destructive [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/70 border-transparent text-white',
			outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground'
		}
	},
	defaultVariants: {
		variant: 'default'
	}
};

// export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
export type BadgeVariant = keyof typeof badgeVariants.variants.variant;
// ============== Generic status =================
//

export function getSelectOptions<TValue extends number>(
	badges: Record<TValue, BadgeProps>
): SelectOption<TValue>[] {
	const entries = Object.keys(badges).map((k) => Number(k) as TValue);

	return entries.map((key) => ({
		value: key,
		label: badges[key].text
	}));
}

export enum GenericStatus {
	ACTIVE = 1,
	NOT_ACTIVE,
	EXPIRED,
	PENDING,
	SUSPENDED
}

export const GenericStatusBadges: Record<GenericStatus, BadgeProps> = {
	[GenericStatus.ACTIVE]: { text: 'Aktyvus', variant: 'green' },
	[GenericStatus.NOT_ACTIVE]: { text: 'Neaktyvus', variant: 'red' },
	[GenericStatus.EXPIRED]: { text: 'Nebegalioja', variant: 'gray' },
	[GenericStatus.PENDING]: { text: 'Neprasidėjęs', variant: 'orange' },
	[GenericStatus.SUSPENDED]: { text: 'Sustabdytas', variant: 'orange-outline' }
};

export const GenericStatusOptions = getSelectOptions(GenericStatusBadges);


export function getStatusBadge<TData extends {
	startDate: Date;
	endDate: Date;
	isSuspended: boolean;
}>(prop: TData): BadgeProps {
	const today = new Date();

	// already ended
	if (today > prop.endDate) {
		return GenericStatusBadges[GenericStatus.EXPIRED];
	}

	// not started yet
	if (today < prop.startDate) {
		return GenericStatusBadges[GenericStatus.PENDING];
	}

	// currently ongoing
	if (prop.isSuspended) {
		return GenericStatusBadges[GenericStatus.SUSPENDED];
	}

	return GenericStatusBadges[GenericStatus.ACTIVE];
}

