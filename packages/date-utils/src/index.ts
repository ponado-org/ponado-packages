import { CalendarDate, today } from "@internationalized/date";

/**
 * Normalizes a Date to midnight UTC
 */
export function normalizeToUTC(d: Date): Date {
	return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
}

/**
 * Calculates age in full years based on a given birth date.
 * Takes into account whether the birthday has already occurred this year.
 *
 * @param birthDate - The birth date as a Date
 * @param today - Optional "today" for testing or overriding
 * @returns Age in complete years
 */
export function calculateAge(birthDate: Date, today: Date = new Date()): number {
	const todayUTC = normalizeToUTC(today);
	const birthUTC = normalizeToUTC(birthDate);

	// Birthday for this year
	const birthdayThisYear = new Date(Date.UTC(todayUTC.getUTCFullYear(), birthUTC.getUTCMonth(), birthUTC.getUTCDate()));

	// Has birthday passed yet this year?
	const hasBirthdayPassed = todayUTC >= birthdayThisYear;

	// Calculate age
	return todayUTC.getUTCFullYear() - birthUTC.getUTCFullYear() - (hasBirthdayPassed ? 0 : 1);
}

/**
 * Converts a Date object into a human-readable string in the format:
 * "YYYY m. MonthName DD d." in Lithuanian.
 *
 * @param date - The Date to format
 * @returns A formatted date string
 */
export function getVerbalDate(date: Date) {
	const months = [
		'sausio', 'vasario', 'kovo', 'balandžio', 'gegužės',
		'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio',
		'lapkričio', 'gruodžio'
	];

	const year = date.getFullYear();
	const monthIndex = date.getMonth();
	const day = date.getDate();

	return `${year} m. ${months[monthIndex]} ${day} d.`;
}

/**
 * Calculates the absolute difference in days between two Date objects.
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Difference in days (rounded to nearest integer)
 */
export function getDifferenceInDays(date1: Date, date2: Date): number {
	const oneDay = 1000 * 60 * 60 * 24;
	const diffInTime = date1.getTime() - date2.getTime();
	return Math.round(diffInTime / oneDay);
}

/**
 * Returns the next anniversary date for a given event date.
 * If the anniversary for this year has already passed, returns the date in the next year.
 *
 * @param eventDate - Original event date
 * @returns Date object representing the next anniversary
 */
export function getAnniversaryDate(eventDate: Date, now: Date = new Date()) {
	const thisYearAnniversary = new Date(
		now.getFullYear(),
		eventDate.getMonth(),
		eventDate.getDate()
	);

	const anniversaryDate =
		thisYearAnniversary < now
			? new Date(now.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate())
			: thisYearAnniversary;

	return anniversaryDate;
}

/**
 * Converts a number of days into a human-readable Lithuanian string.
 * For example: "vakar", "3 dien.", "2 sav.", "5 mėn.", "1 met."
 *
 * @param diffDays - Number of days difference
 * @returns Human-readable string representing the difference
 */
export function formatDaysDifference(diffDays: number) {
	const diffWeeks = Math.floor(diffDays / 7);
	const diffMonths = Math.floor(diffDays / 30);
	const diffYears = Math.floor(diffDays / 365);

	if (diffDays === 1) {
		return 'vakar';
	} else if (diffDays < 7) {
		return `${diffDays} dien.`;
	} else if (diffWeeks < 4) {
		return `${diffWeeks} sav.`;
	} else if (diffMonths < 12) {
		return `${diffMonths} mėn.`;
	} else {
		return `${diffYears} met.`;
	}
}

/**
 * Calculates the number of full years that have passed since a given anniversary date.
 *
 * @param anniversaryDate - The date of the anniversary
 * @returns Number of years since the anniversary
 */
export function getYearsOnAnniversary(anniversaryDate: Date, now: Date = new Date()) {

	let yearsOnAnniversary = now.getFullYear() - anniversaryDate.getFullYear();
	const tmpDate = new Date(now.getFullYear(), anniversaryDate.getMonth(), anniversaryDate.getDate());

	if (tmpDate < anniversaryDate) {
		yearsOnAnniversary++;
	}

	return yearsOnAnniversary;
}


/**
 * Returns the number of days until the next occurrence of a given date.
 * Accepts a JavaScript Date object.
 *
 * @param birthDate - The birth date as a Date
 * @param now - Optional "today" date for testing or overriding
 * @returns Number of days until the next occurrence
 */
export function getDaysUntilAnniversary(birthDate: Date, now: Date = new Date()): number {

	const todayUTC = normalizeToUTC(now);

	// Birthday this year
	let nextBirthday = new Date(Date.UTC(todayUTC.getUTCFullYear(), birthDate.getMonth(), birthDate.getDate()));

	// If birthday this year has passed, move to next year
	if (nextBirthday < todayUTC) {
		nextBirthday = new Date(Date.UTC(todayUTC.getUTCFullYear() + 1, birthDate.getMonth(), birthDate.getDate()));
	}

	// Difference in milliseconds
	const diffTime = nextBirthday.getTime() - todayUTC.getTime();

	// Convert to full days
	return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}


/**
 * Creates a CalendarDate for a specified number of years ago from today.
 * 
 * @param years - The number of years to go back from the current date
 * @param now - Optional base date (defaults to today in UTC)
 * @returns A CalendarDate representing the date that many years ago
 * 
 * @example
 * // Get calendar date 5 years ago from today
 * const fiveYearsAgo = calendarDateYearsAgo(5);
 * 
 * @example
 * // Get calendar date 18 years ago (useful for age verification)
 * const minBirthDate = calendarDateYearsAgo(18);
 */
export function calendarDateYearsAgo(years: number, now = today("UTC")) {
	return new CalendarDate(now.year - years, now.month, now.day);
}
