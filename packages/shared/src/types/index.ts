import type { Component, Snippet } from 'svelte';
import { BadgeVariant } from '../badges';
export type SelectType = 'multiple' | 'single';
import { type Linksnis } from "@ponado/lt-utils";
import { FileRejectedReason } from '../enums';

export type SelectOptionType = number;

export interface SelectOption<SelectOptionType = number> {
	value: SelectOptionType;
	label: string;
}

export interface BadgeProps {
	text: string;
	variant: BadgeVariant;
	icon?: Component | undefined | null;
}

export type SizeVariant = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type SwitchProps = {
	id?: string | undefined;                     // optional id
	checked?: boolean | undefined;
	class?: string;
	disabled?: boolean;
	name?: string;
	onCheckedChange?: (v: boolean) => void;
	label?: string;
	icon?: Component | undefined | null;
	description?: string;
}

// utils/types.ts (or shared-types.ts if you prefer)

export type ValueByMultiple<T, M extends boolean = false> = {
	/** Whether multiple values can be selected */
	multiple?: M;
	/** Selected value(s) depending on `multiple` */
	value: M extends true ? T[] : T | null;
	/** Change handler matching value type */
	onValueChange?: (v: M extends true ? T[] : T | null) => void;
};

export type SelectPropsBase<T extends SelectOptionType, Multiple extends boolean = false> = {
	description?: string;
	name?: string;
	triggerSnippet?: Snippet;
	label?: string | null;
	class?: string;
	popoverClass?: string;
	sizeVariant?: SizeVariant;
	options: SelectOption<T>[];
	badges?: Record<T, BadgeProps>;
	placeholder?: string;
	disabled?: boolean | null;
	value?: Multiple extends true ? T[] : T | undefined;
	wrap?: boolean;
	truncate?: boolean;
	multiple?: Multiple;
	onValueChange?: (v: Multiple extends true ? T[] : T | null) => void;
};

// =============== Navigation ===============

export type UserInfo = {
	email: string;
	firstName?: string;
	lastName?: string;
	imageUrl?: string | undefined | null;
	rolesMask: number;
	personGroups: number[];
};

export interface NavbarItem<T extends UserInfo> {
	id?: any;
	href: string;
	label: string;
	children?: NavbarItem<T>[];
	// Role-based visibility options
	allowMask?: number;
	denyMask?: number;
	// Custom visibility function for complex logic
	isVisible?: (user: T) => boolean;
}

type NavbarMenuBase<T extends UserInfo> = {
	id?: any;
	triggerText: string;
	allowMask?: number;
	denyMask?: number;
	allowedPersonGroups?: number[];
	isVisible?: (user: T) => boolean;
};

type NavbarMenuLink<T extends UserInfo> = NavbarMenuBase<T> & {
	type: 'link';
	href: string;
};

type NavbarMenuItems<T extends UserInfo> = NavbarMenuBase<T> & {
	type: 'menu';
	items: NavbarItem<T>[];
};

export type NavbarMenu<T extends UserInfo> = NavbarMenuLink<T> | NavbarMenuItems<T>;

export interface FileInfo {
	fileId: string;
	name: string;
	size: number;
}

export type FileUploadResult =
	| {
		success: true;
		fileInfo: FileInfo;
	}
	| {
		success: false;
		error: string; // Required, not optional
		code?: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'UPLOAD_FAILED' | 'VALIDATION_ERROR';
	};

export const CaseStyles = ['lower', 'upper', 'camel'] as const;
export type CaseStyle = (typeof CaseStyles)[number];

export const TemplateFileTypes = ['docx', 'svg', 'typ'] as const;
export type TemplateFileType = (typeof TemplateFileTypes)[number];

//============ NOTE: Template field

export type TemplateFieldBase = {
	variable: string;
	caseStyle: CaseStyle | null;
	rawValue: string;
	isFirstName: boolean
	isLastName: boolean
	isOptional: boolean;
	linksnis: Linksnis | undefined | null
};

// final union
export type TemplateField = TemplateFieldBase

export type TemplateFieldDTO = TemplateField & { id: number };

type TemplateFieldValidation = { error?: string; badge?: BadgeProps | null; isValid: boolean; }
// // Final union
// //
export type TemplateFieldValidationDTO = TemplateField & TemplateFieldValidation;


//============ NOTE: Field validation

type FileValidationFnProps = {
	file: File;
};

export type FileValidationResult<TSuccess = {}> =
	| {
		isValid: true;
		isFileSaved: true;
		fileInfo: FileInfo;
	} & TSuccess
	| {
		isValid: true;
		isFileSaved: false;
	} & TSuccess
	| {
		isValid: false;
		rejectReason: FileRejectedReason;
		details?: string;
	};


export type FileValidationFn<TSuccess = {}> = (
	props: FileValidationFnProps
) => FileValidationResult<TSuccess> | Promise<FileValidationResult<TSuccess>>;
