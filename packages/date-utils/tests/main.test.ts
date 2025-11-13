import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	calculateAge,
	getVerbalDate,
	getDifferenceInDays,
	getAnniversaryDate,
	formatDaysDifference,
	getYearsOnAnniversary,
	getDaysUntilAnniversary
} from '../src/index';

// Mock "today" for consistency
// const mockToday = new Date("2025-12-08T00:00:00.000Z");
const mockToday = new Date(Date.UTC(2025, 11, 8, 0, 0, 0, 0));

describe('utils', () => {
	beforeEach(() => {
		vi.setSystemTime(mockToday);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('calculateAge', () => {
		it('calculates correct age when birthday has passed', () => {
			const birthday = new Date(Date.UTC(2000, 1, 1, 0, 0, 0));
			const age = calculateAge(birthday, mockToday);
			console.log({ age });
		});

		it('calculates correct age when birthday has not passed yet', () => {
			const birthday = new Date(Date.UTC(2000, 11, 20, 0, 0, 0));
			const age = calculateAge(birthday, mockToday);
			expect(age).toBe(24);
		});

		it('calculates correct age when birthday has not passed yet', () => {
			const birthday = new Date(Date.UTC(1960, 11, 1, 0, 0, 0));
			const age = calculateAge(birthday, mockToday);
			expect(age).toBe(65);
		});
	});

	describe('getVerbalDate', () => {
		it('returns a properly formatted string', () => {
			const date = new Date('2025-02-10T00:00:00.000Z');
			expect(getVerbalDate(date)).toBe('2025 m. vasario 10 d.');
		});
	});

	describe('getDifferenceInDays', () => {
		it('calculates correct difference in days', () => {
			const date1 = new Date('2025-06-15T00:00:00.000Z');
			const date2 = new Date('2025-06-10T00:00:00.000Z');
			expect(getDifferenceInDays(date1, date2)).toBe(-5);
		});
	});

	describe('getAnniversaryDate', () => {
		it("returns this year's anniversary if it has not passed", () => {
			const eventDate = new Date('2025-12-25T00:00:00.000Z');
			const anniversary = getAnniversaryDate(eventDate);
			expect(anniversary.getFullYear()).toBe(2025);
			expect(anniversary.getMonth()).toBe(11); // December
			expect(anniversary.getDate()).toBe(25);
		});

		it("returns next year's anniversary if this year's has passed", () => {
			const eventDate = new Date('2025-01-01T00:00:00.000Z');
			const anniversary = getAnniversaryDate(eventDate);
			expect(anniversary.getFullYear()).toBe(2026);
		});
	});

	describe('formatDaysDifference', () => {
		it("returns 'rytoj' for 1 day", () => {
			expect(formatDaysDifference(1)).toBe('rytoj');
		});

		it("returns 'vakar' for -1 day", () => {
			expect(formatDaysDifference(-1)).toBe('vakar');
		});

		it("returns 'šiandien' for 0 day", () => {
			expect(formatDaysDifference(0)).toBe('šiandien');
		});

		it('returns correct string for days, weeks, months, years', () => {
			expect(formatDaysDifference(3)).toBe('3 d.');
			expect(formatDaysDifference(10)).toBe('10 d.');
			expect(formatDaysDifference(40)).toBe('1 mėn.');
			expect(formatDaysDifference(400)).toBe('1 m.');
		});
	});

	describe('getYearsOnAnniversary', () => {
		it('calculates correct years on anniversary', () => {
			const anniversary = new Date('2020-06-20');
			expect(getYearsOnAnniversary(anniversary, mockToday)).toBe(5); // since mockToday is 2025-06-15
		});
	});

	describe('getDaysUntilAnniversary', () => {
		it('returns correct days until next birthday', () => {
			const birthday = new Date('2025-12-18');
			expect(getDaysUntilAnniversary(birthday, mockToday)).toBe(10);
		});

		it('returns correct days if birthday already passed this year', () => {
			const birthday = new Date('2025-01-01');
			expect(getDaysUntilAnniversary(birthday, mockToday)).toBe(24);
		});
	});
});
