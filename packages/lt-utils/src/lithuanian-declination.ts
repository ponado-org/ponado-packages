export type GramaticalCase = 'nominative' | 'genitive' | 'dative' | 'accusative' | 'instrumental' | 'locative';

// Short form aliases for convenience
export type Linksnis = 'kil' | 'nau' | 'gal' | 'ina' | 'vie' | 'sau';

const CASE_MAP: Record<Linksnis, GramaticalCase> = {
	kil: 'genitive',      // kilmininkas
	nau: 'dative',        // naudininkas
	gal: 'accusative',    // galininkas
	ina: 'instrumental',  // įnagininkas
	vie: 'locative',      // vietininkas
	sau: 'nominative'     // vardininkas (šauksmininkas)
};

const SHORT_CASES = new Set<Linksnis>(['kil', 'nau', 'gal', 'ina', 'vie', 'sau']);

// convert CASE_MAP { kil: 'genitive', ... } → { genitive: 'kil', ... }
const CASE_MAP_REVERSE: Record<GramaticalCase, Linksnis> =
	Object.fromEntries(
		Object.entries(CASE_MAP).map(([short, long]) => [long, short])
	) as Record<GramaticalCase, Linksnis>;

/**
 * Converts full case name to short form, or returns short form as-is
 */
const normalizeCase = (grammaticalCase: GramaticalCase | Linksnis): Linksnis => {
	// if short — return directly
	if (SHORT_CASES.has(grammaticalCase as Linksnis)) return grammaticalCase as Linksnis;

	// if long — lookup from already prepared map (O(1))
	return CASE_MAP_REVERSE[grammaticalCase as GramaticalCase] ?? 'sau';
};


/**
 * Declines a full name (first name and/or surname) to the specified grammatical case
 *
 * @param {string} name Lithuanian name or surname (can include spaces for full names)
 * @param {GramaticalCase | Linksnis} grammaticalCase grammatical case (e.g., 'genitive' or 'kil')
 * @return {string} declined name
 */
export const declineFullName = (
	name: string,
	grammaticalCase: GramaticalCase | Linksnis
): string => {
	// Split by spaces or hyphens, but keep the separators in the array
	const nameParts = name.split(/([-\s])/);

	// Map only the name parts, leave separators as they are
	const declined = nameParts.map(part => {
		if (part === '-' || part.match(/^\s$/)) {
			return part; // keep separator
		}
		return declineName(part, grammaticalCase);
	});

	return declined.join('');
};

/**
 * Declines a single word (name or surname) to the specified grammatical case
 *
 * @param {string} word Lithuanian name or surname
 * @param {GramaticalCase | Linksnis} grammaticalCase grammatical case (e.g., 'genitive' or 'kil')
 * @return {string} declined word
 */
export const declineName = (word: string, grammaticalCase: GramaticalCase | Linksnis = 'nominative'): string => {
	// Normalize to short form
	const shortCase = normalizeCase(grammaticalCase);

	const declensionRules: Record<Linksnis, Record<string, string>> = {
		kil: { 'a': 'os', 'as': 'o', 'ė': 'ės', 'tis': 'čio', 'dis': 'džio', 'is': 'io', 'us': 'aus', 'tys': 'čio', 'dys': 'džio', 'ys': 'io' },
		nau: { 'a': 'ai', 'as': 'ui', 'ė': 'ei', 'tis': 'čiui', 'dis': 'džiui', 'is': 'iui', 'us': 'ui', 'tys': 'čiui', 'dys': 'džiui', 'ys': 'iui' },
		gal: { 'a': 'ą', 'as': 'ą', 'ė': 'ę', 'is': 'į', 'us': 'ų', 'ys': 'į' },
		ina: { 'a': 'a', 'as': 'u', 'ė': 'e', 'tis': 'čiu', 'dis': 'džiu', 'is': 'iu', 'us': 'u', 'tys': 'čiu', 'dys': 'džiu', 'ys': 'iu' },
		vie: { 'a': 'oje', 'as': 'e', 'ė': 'ėje', 'is': 'yje', 'us': 'uje', 'ys': 'yje' },
		sau: { 'a': 'a', 'as': 'ai', 'ė': 'e', 'is': 'i', 'us': 'au', 'ys': 'y' }
	};

	const rules = declensionRules[shortCase];

	// Check endings from longest to shortest to match more specific patterns first
	const sortedEndings = Object.keys(rules).sort((a, b) => b.length - a.length);

	for (const ending of sortedEndings) {
		if (word.endsWith(ending)) {
			return word.slice(0, -ending.length) + rules[ending];
		}
	}

	return word;
}
