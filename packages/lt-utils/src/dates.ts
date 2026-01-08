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
