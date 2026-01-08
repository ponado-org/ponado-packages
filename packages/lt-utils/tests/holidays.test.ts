import {
	isDayOff,
	isWeekend,
	isHoliday,
	getHolidayName,
	getLithuanianHolidays,
	getEasterDate
} from "../src/holidays";
import { describe, expect, it } from "vitest";

describe("Lithuanian Holidays 2025", () => {

	describe("Fixed holidays", () => {
		const fixedHolidays = [
			{ date: new Date(2025, 0, 1), name: "Naujieji metai" },
			{ date: new Date(2025, 1, 16), name: "Lietuvos valstybės atkūrimo diena" },
			{ date: new Date(2025, 2, 11), name: "Lietuvos Nepriklausomybės atkūrimo diena" },
			{ date: new Date(2025, 4, 1), name: "Tarptautinė darbo diena" },
			{ date: new Date(2025, 5, 24), name: "Joninės" },
			{ date: new Date(2025, 6, 6), name: "Karaliaus Mindaugo karūnavimo diena" },
			{ date: new Date(2025, 7, 15), name: "Žolinė" },
			{ date: new Date(2025, 10, 1), name: "Visų šventųjų diena" },
			{ date: new Date(2025, 10, 2), name: "Vėlinės" },
			{ date: new Date(2025, 11, 24), name: "Šv. Kūčios" },
			{ date: new Date(2025, 11, 25), name: "Šv. Kalėdos" },
			{ date: new Date(2025, 11, 26), name: "Antroji Šv. Kalėdų diena" },
		];

		fixedHolidays.forEach(({ date, name }) => {
			it(`${name} should be a holiday`, () => {
				expect(isHoliday(date)).toBe(true);
			});

			it(`${name} should be a day off`, () => {
				expect(isDayOff(date)).toBe(true);
			});

			it(`${name} should return correct name`, () => {
				expect(getHolidayName(date)).toBe(name);
			});
		});
	});

	describe("Movable holidays (Easter-based)", () => {
		it("Easter 2025 should be April 20", () => {
			const easter = getEasterDate(2025);
			expect(easter.getMonth()).toBe(3); // April (0-indexed)
			expect(easter.getDate()).toBe(20);
		});

		it("Šv. Velykos should be a holiday", () => {
			const easter = new Date(2025, 3, 20);
			expect(isHoliday(easter)).toBe(true);
			expect(getHolidayName(easter)).toBe("Šv. Velykos");
		});

		it("Antroji Šv. Velykų diena should be a holiday", () => {
			const easterMonday = new Date(2025, 3, 21);
			expect(isHoliday(easterMonday)).toBe(true);
			expect(getHolidayName(easterMonday)).toBe("Antroji Šv. Velykų diena");
		});
	});

	describe("Weekend detection", () => {
		it("Saturday should be weekend", () => {
			const saturday = new Date(2025, 0, 4); // January 4, 2025 is Saturday
			expect(isWeekend(saturday)).toBe(true);
		});

		it("Sunday should be weekend", () => {
			const sunday = new Date(2025, 0, 5); // January 5, 2025 is Sunday
			expect(isWeekend(sunday)).toBe(true);
		});

		it("Monday should not be weekend", () => {
			const monday = new Date(2025, 0, 6); // January 6, 2025 is Monday
			expect(isWeekend(monday)).toBe(false);
		});

		it("Friday should not be weekend", () => {
			const friday = new Date(2025, 0, 3); // January 3, 2025 is Friday
			expect(isWeekend(friday)).toBe(false);
		});
	});

	describe("isDayOff - combined check", () => {
		it("Holiday on weekday should be day off", () => {
			const independence = new Date(2025, 2, 11); // Tuesday
			expect(isDayOff(independence)).toBe(true);
		});

		it("Weekend should be day off", () => {
			const saturday = new Date(2025, 0, 4);
			expect(isDayOff(saturday)).toBe(true);
		});

		it("Holiday on weekend should be day off", () => {
			const allSaints = new Date(2025, 10, 1); // Saturday, November 1
			expect(isDayOff(allSaints)).toBe(true);
		});

		it("Regular weekday should not be day off", () => {
			const regularDay = new Date(2025, 0, 7); // Tuesday, January 7
			expect(isDayOff(regularDay)).toBe(false);
		});
	});

	describe("Non-holidays", () => {
		it("Regular work day should not be holiday", () => {
			const regularDay = new Date(2025, 5, 10); // June 10, 2025
			expect(isHoliday(regularDay)).toBe(false);
			expect(getHolidayName(regularDay)).toBe(null);
		});

		it("Day before holiday should not be holiday", () => {
			const dayBefore = new Date(2025, 11, 23); // December 23
			expect(isHoliday(dayBefore)).toBe(false);
		});

		it("Day after holiday should not be holiday", () => {
			const dayAfter = new Date(2025, 11, 27); // December 27
			expect(isHoliday(dayAfter)).toBe(false);
		});
	});

	describe("getLithuanianHolidays", () => {
		it("should return 14 holidays for 2025", () => {
			const holidays = getLithuanianHolidays(2025);
			expect(holidays).toHaveLength(14);
		});

		it("should include all expected holidays", () => {
			const holidays = getLithuanianHolidays(2025);
			const dateStrings = holidays.map(d =>
				`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
			);

			expect(dateStrings).toContain('2025-01-01'); // New Year
			expect(dateStrings).toContain('2025-02-16'); // State Restoration
			expect(dateStrings).toContain('2025-03-11'); // Independence
			expect(dateStrings).toContain('2025-04-20'); // Easter
			expect(dateStrings).toContain('2025-04-21'); // Easter Monday
			expect(dateStrings).toContain('2025-05-01'); // Labor Day
			expect(dateStrings).toContain('2025-06-24'); // Midsummer
			expect(dateStrings).toContain('2025-07-06'); // Mindaugas
			expect(dateStrings).toContain('2025-08-15'); // Assumption
			expect(dateStrings).toContain('2025-11-01'); // All Saints
			expect(dateStrings).toContain('2025-11-02'); // All Souls
			expect(dateStrings).toContain('2025-12-24'); // Christmas Eve
			expect(dateStrings).toContain('2025-12-25'); // Christmas
			expect(dateStrings).toContain('2025-12-26'); // Second Christmas
		});
	});

	describe("Default parameter (today)", () => {
		it("should work without parameters", () => {
			// These should not throw errors
			expect(() => isHoliday()).not.toThrow();
			expect(() => isWeekend()).not.toThrow();
			expect(() => isDayOff()).not.toThrow();
		});
	});

	describe("Edge cases", () => {
		it("should handle year boundaries correctly", () => {
			const newYear = new Date(2025, 0, 1);
			const newYearsEve = new Date(2024, 11, 31);

			expect(isHoliday(newYear)).toBe(true);
			expect(isHoliday(newYearsEve)).toBe(false);
		});

		it("should handle different years", () => {
			const christmas2024 = new Date(2024, 11, 25);
			const christmas2025 = new Date(2025, 11, 25);

			expect(isHoliday(christmas2024)).toBe(true);
			expect(isHoliday(christmas2025)).toBe(true);
		});
	});
});

describe("Easter calculation across years", () => {
	const knownEasters = [
		{ year: 2024, month: 2, day: 31 }, // March 31, 2024
		{ year: 2025, month: 3, day: 20 }, // April 20, 2025
		{ year: 2026, month: 3, day: 5 },  // April 5, 2026
		{ year: 2027, month: 2, day: 28 }, // March 28, 2027
	];

	knownEasters.forEach(({ year, month, day }) => {
		it(`Easter ${year} should be correct`, () => {
			const easter = getEasterDate(year);
			expect(easter.getMonth()).toBe(month);
			expect(easter.getDate()).toBe(day);
		});
	});
});
