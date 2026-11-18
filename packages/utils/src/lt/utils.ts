/**
 * Sanitizes a filename by transliterating Lithuanian characters to ASCII
 * and replacing unsafe filesystem characters with underscores.
 */
export function sanitizeFilename(name: string): string {
	if (!name || name.trim() === '') {
		throw new Error('Filename cannot be empty');
	}

	const replacements: Record<string, string> = {
		ą: 'a',
		č: 'c',
		ę: 'e',
		ė: 'e',
		į: 'i',
		š: 's',
		ų: 'u',
		ū: 'u',
		ž: 'z',
		Ą: 'A',
		Č: 'C',
		Ę: 'E',
		Ė: 'E',
		Į: 'I',
		Š: 'S',
		Ų: 'U',
		Ū: 'U',
		Ž: 'Z'
	};

	const sanitized = name
		.replace(/[ąčęėįšųūžĄČĘĖĮŠŲŪŽ]/g, (char) => replacements[char]!)
		.replace(/[^a-zA-Z0-9._-]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');

	if (!sanitized) {
		throw new Error('Filename contains only invalid characters');
	}

	return sanitized;
}

// Mapping of Lithuanian special letters to their ASCII equivalents.
// Includes both lowercase and uppercase letters for proper normalization.
const mapping: Record<string, string> = {
	ą: 'a',
	č: 'c',
	ę: 'e',
	ė: 'e',
	į: 'i',
	š: 's',
	ų: 'u',
	ū: 'u',
	ž: 'z',
	Ą: 'A',
	Č: 'C',
	Ę: 'E',
	Ė: 'E',
	Į: 'I',
	Š: 'S',
	Ų: 'U',
	Ū: 'U',
	Ž: 'Z'
};

/**
 * normalizeLithuanianLetters
 *
 * Converts Lithuanian special letters in a string to their ASCII equivalents.
 *
 * Example:
 *   "ąčęėįšųūž" -> "aceeisuuz"
 *
 * Useful for:
 *   - Search normalization
 *   - URL slugs
 *   - Anywhere ASCII-only text is required
 *
 * @param s - The input string potentially containing Lithuanian letters
 * @returns A new string with Lithuanian letters replaced by ASCII equivalents
 */
export const normalizeLithuanianLetters = (s: string) => s.replace(/./g, (c) => mapping[c] ?? c);
