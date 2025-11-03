import type { BadgeVariant } from "$scn/badge/index.js";
import type { Snippet } from "svelte";

export type SelectType = "multiple" | "single";

export type SelectOptionType = number | string;

export interface SelectOption<SelectOptionType = number> {
	value: SelectOptionType;
	label: string;
}

export interface BadgeProps {
	text: string;
	variant: BadgeVariant;
}

export interface BadgeProps {
	text: string;
	variant: BadgeVariant;
}

export type SizeVariant = "sm" | "md" | "lg" | "xl" | "2xl";

export interface SwitchProps {
	checked?: boolean | undefined;
	class?: string;
	label?: string;
	icon?: any;
	description?: string;
	onchange?: (e: Event) => void;
}


// Create overloaded interface for better type safety
export type SelectPropsBase<OType> = {
	description?: string;
	name?: string;
	triggerSnippet?: Snippet;
	options: SelectOption<OType>[];
	badges?: Record<number, BadgeProps>;
	label?: string | null;
	class?: string;
	popoverClass?: string;
	sizeVariant?: SizeVariant;
	placeholder?: string;
	disabled?: boolean | null;
	value: any;
	wrap?: boolean;
	truncate?: boolean;
	multiple?: boolean;
	onValueChange?: (v: any) => void;
}


export const ClassInputButtons: SelectOption[] = [
	{ value: 0, label: "PUG" },
	{ value: 1, label: "1" },
	{ value: 2, label: "2" },
	{ value: 3, label: "3" },
	{ value: 4, label: "4" },
	{ value: 5, label: "5" },
	{ value: 6, label: "6" },
	{ value: 7, label: "7" },
	{ value: 8, label: "8" },
	{ value: 9, label: "9" },
	{ value: 10, label: "10" },
	{ value: 11, label: "11" },
	{ value: 12, label: "12" },
	{ value: 13, label: "I" },
	{ value: 14, label: "II" },
	{ value: 15, label: "III" },
	{ value: 16, label: "IV" },
];



// =============== Navigation ===============

export type UserInfo = {
	email: string;
	firstName: string;
	lastName: string;
	roleMask: number,
	personGroups: number[],
}

export interface NavbarItem {
	href: string;
	label: string;
	children?: NavbarItem[];
	// Role-based visibility options
	allowMask?: number;
	denyMask?: number;
	// Custom visibility function for complex logic
	isVisible?: (user: UserInfo) => boolean;
}

export interface NavbarMenu {
	trigger: string;
	items: NavbarItem[];
	// Menu-level visibility controls
	allowMask?: number;
	denyMask?: number;
	allowedPersonGroups?: number[];
	isVisible?: (user: UserInfo) => boolean;
}

