import type { Row } from '@tanstack/table-core';
import { asc, desc } from 'drizzle-orm';
import { BadgeProps, SelectOptionType } from '../types';

export function filterBadges<T extends SelectOptionType>(
	badges: Record<T, BadgeProps>,
	filterFn: (key: T, value: BadgeProps) => boolean
): Partial<Record<T, BadgeProps>> {
	return Object.fromEntries(
		Object.entries(badges).filter(([key, value]) => filterFn(Number(key) as T, value as BadgeProps))
	) as Partial<Record<T, BadgeProps>>;
}

export function getSubsetFn<T>(fieldName: keyof T) {
	return (row: Row<T>, _: unknown, filterValue: number[] | undefined) => {
		if (!filterValue || filterValue.length === 0) return true;
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		//@ts-expect-error
		return filterValue?.every((groupId) => row.original[fieldName]?.includes(groupId));
	};
}

export function capitalizeName(name: string): string {
	if (!name) return '';

	return name
		.trim()
		.split(/(\s+|-)/)
		.map(part => {
			// Skip empty parts and separators (spaces, hyphens)
			if (!part || /^(\s+|-)$/.test(part)) {
				return part;
			}
			// Capitalize first letter, lowercase the rest
			return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
		})
		.join('');
}


export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number = 500) {
	let timeout: ReturnType<typeof setTimeout>;

	return function(...args: Parameters<T>) {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), delay);
	};
}


export const getDirectionFn = (dir: 'asc' | 'desc') => (dir === 'asc' ? asc : desc);
