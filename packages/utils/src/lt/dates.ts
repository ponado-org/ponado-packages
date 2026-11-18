/**
 * Converts a Date object into a human-readable string in the format:
 * "YYYY m. MonthName DD d." in Lithuanian.
 *
 * @param date - The Date to format
 * @returns A formatted date string
 */
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

/**
 * Converts a number of days into a human-readable Lithuanian string.
 * For example: "vakar", "3 dien.", "2 sav.", "5 mėn.", "1 met."
 *
 * @param diffDays - Number of days difference
 * @returns Human-readable string representing the difference
 */
export function formatDaysDifference(diffDays: number) {
	const abs = Math.abs(diffDays);
	const diffMonths = Math.floor(abs / 30);
	const diffYears = Math.floor(abs / 365);

	if (diffDays === -1) {
		return 'vakar';
	} else if (diffDays === 0) {
		return 'šiandien';
	} else if (diffDays === 1) {
		return 'rytoj';
	} else if (abs < 31) {
		return `${abs} dien.`;
	} else if (diffMonths <= 12) {
		return `${diffMonths} mėn.`;
	} else {
		return `${diffYears} met.`;
	}
}
