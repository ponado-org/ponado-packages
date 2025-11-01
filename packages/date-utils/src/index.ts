import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";

export function yearsAgo(n: number): CalendarDate {
	const now = today(getLocalTimeZone());
	const ago = now.subtract({ years: n });
	return ago;
}

export function calculateAge(birthDate: Date): number {
	const today = normalizeToUTC(new Date());

	const hasBirthdayPassed =
		today.getMonth() > birthDate.getMonth() ||
		(today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

	return today.getFullYear() - birthDate.getFullYear() - (hasBirthdayPassed ? 0 : 1);
}

export function getVerbalDate(date: Date) {
	const months = [
		'sausio',
		'vasario',
		'kovo',
		'balandžio',
		'gegužės',
		'birželio',
		'liepos',
		'rugpjūčio',
		'rugsėjo',
		'spalio',
		'lapkričio',
		'gruodžio'
	];

	const year = date.getFullYear();
	const monthIndex = date.getMonth();
	const day = date.getDate();

	return `${year} m. ${months[monthIndex]} ${day} d.`;
}

export function getDifferenceInDays(date1: Date, date2: Date): number {
	const oneDay = 1000 * 60 * 60 * 24;
	const diffInTime = date1.getTime() - date2.getTime();
	return Math.round(diffInTime / oneDay);
}

export const normalizeToUTC = (d: Date): Date => {
	const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
	return utc(
		d.getFullYear(), // local year
		d.getMonth(), // local month
		d.getDate() // local day
	);
};

export function getAnniversaryDate(eventDate: Date) {
	const today = new Date();
	const thisYearAnniversary = new Date(
		today.getFullYear(),
		eventDate.getMonth(),
		eventDate.getDate()
	);

	// If the birthday this year has already passed, calculate for the next year
	const anniversaryDate =
		thisYearAnniversary < today
			? new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate())
			: thisYearAnniversary;

	return anniversaryDate
}

export function prettyDaysDifference(diffDays: number) {

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

export function yearsOnAnniversary(anniversaryDate: Date) {

	const today = new Date()

	let yearsOnAnniversary = today.getFullYear() - anniversaryDate.getFullYear()

	let tmpDate = new Date(today.getFullYear(), anniversaryDate.getMonth(), anniversaryDate.getDate())

	if (tmpDate < anniversaryDate) {
		yearsOnAnniversary++
	}

	return yearsOnAnniversary
}

export function daysUntilAnniversary(birthDate: Date): number {
	const today = new Date();
	const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

	// If the birthday this year has already passed, calculate for the next year
	const nextBirthday = thisYearBirthday < today
		? new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate())
		: thisYearBirthday;

	// Calculate the difference in days
	const diffTime = nextBirthday.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	return diffDays;
}
