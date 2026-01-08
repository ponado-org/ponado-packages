/** Western Easter — Meeus/Jones/Butcher */
export function getEasterDate(year: number): Date {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

/** Fixed-date feasts (same each year). */
export function getFixedFeasts(year: number) {
	const d = (month: number, day: number) => new Date(year, month - 1, day);
	return {
		holyNameOfJesus: d(1, 3),
		epiphany: d(1, 6),
		lordsBaptism: d(1, 13),
		presentation: d(2, 2),
		annunciation: d(3, 25),
		visitation: d(5, 31),
		sacredHeart: d(6, 16),
		nativityOfJohn: d(6, 24),
		peterAndPaul: d(6, 29),
		transfiguration: d(8, 6),
		assumption: d(8, 15),
		allSaints: d(11, 1),
		allSouls: d(11, 2),
		immaculateConception: d(12, 8),
		christmas: d(12, 25),
		holyFamily: d(12, 30),
	};
}

/** Movable feasts */
export function getMovableFeasts(year: number) {
	const easter = getEasterDate(year);
	return {
		easter,
		ashWednesday: addDays(easter, -46),
		palmSunday: addDays(easter, -7),
		maundyThursday: addDays(easter, -3),
		goodFriday: addDays(easter, -2),
		holySaturday: addDays(easter, -1),
		easterMonday: addDays(easter, 1),
		ascension: addDays(easter, 39),
		pentecost: addDays(easter, 49),
		holyTrinity: addDays(easter, 56),
		corpusChristi: addDays(easter, 60),
	};
}

/** Full liturgical calendar (fixed + movable) */
export function getLiturgicalCalendar(year: number) {
	return {
		year,
		...getFixedFeasts(year),
		...getMovableFeasts(year),
	};
}

/** Lithuanian public holidays */
export function getLithuanianHolidays(year: number) {
	const d = (month: number, day: number) => new Date(year, month - 1, day);
	const easter = getEasterDate(year);

	return [
		d(1, 1),    // Naujieji metai
		d(2, 16),   // Lietuvos valstybės atkūrimo diena
		d(3, 11),   // Lietuvos Nepriklausomybės atkūrimo diena
		easter,     // Šv. Velykos
		addDays(easter, 1), // Antroji Šv. Velykų diena
		d(5, 1),    // Tarptautinė darbo diena
		d(6, 24),   // Joninės
		d(7, 6),    // Karaliaus Mindaugo karūnavimo diena
		d(8, 15),   // Žolinė
		d(11, 1),   // Visų šventųjų diena
		d(11, 2),   // Vėlinės
		d(12, 24),  // Šv. Kūčios
		d(12, 25),  // Šv. Kalėdos
		d(12, 26),  // Antroji Šv. Kalėdų diena
	];
}

/** Format date as YYYY-MM-DD for comparison */
function formatDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** Check if a given date is a Lithuanian public holiday */
export function isHoliday(date: Date = new Date()): boolean {
	const year = date.getFullYear();
	const holidays = getLithuanianHolidays(year);
	const dateKey = formatDateKey(date);

	return holidays.some(holiday => formatDateKey(holiday) === dateKey);
}

/** Check if a given date is a weekend (Saturday or Sunday) */
export function isWeekend(date: Date = new Date()): boolean {
	const day = date.getDay();
	return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/** Check if a given date is a day off (weekend or holiday) */
export function isDayOff(date: Date = new Date()): boolean {
	return isWeekend(date) || isHoliday(date);
}

/** Get the name of the holiday (in Lithuanian) */
export function getHolidayName(date: Date): string | null {
	const year = date.getFullYear();
	const dateKey = formatDateKey(date);
	const d = (month: number, day: number) => formatDateKey(new Date(year, month - 1, day));
	const easter = getEasterDate(year);

	const holidays: Record<string, string> = {
		[d(1, 1)]: 'Naujieji metai',
		[d(2, 16)]: 'Lietuvos valstybės atkūrimo diena',
		[d(3, 11)]: 'Lietuvos Nepriklausomybės atkūrimo diena',
		[formatDateKey(easter)]: 'Šv. Velykos',
		[formatDateKey(addDays(easter, 1))]: 'Antroji Šv. Velykų diena',
		[d(5, 1)]: 'Tarptautinė darbo diena',
		[d(6, 24)]: 'Joninės',
		[d(7, 6)]: 'Karaliaus Mindaugo karūnavimo diena',
		[d(8, 15)]: 'Žolinė',
		[d(11, 1)]: 'Visų šventųjų diena',
		[d(11, 2)]: 'Vėlinės',
		[d(12, 24)]: 'Šv. Kūčios',
		[d(12, 25)]: 'Šv. Kalėdos',
		[d(12, 26)]: 'Antroji Šv. Kalėdų diena',
	};

	return holidays[dateKey] ?? null;
}
