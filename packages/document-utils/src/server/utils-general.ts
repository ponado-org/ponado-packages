export function escapeRegexLiteral(str: string) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex chars
}
export function substituteBuffer({
	buffer,
	substitutions,
	escapeRegex = true
}: {
	buffer: string;
	substitutions: Record<string, string>;
	escapeRegex?: boolean;
}) {
	if (!substitutions || Object.keys(substitutions).length === 0) return buffer;
	const keys = Object.keys(substitutions);
	// escape only for regex matching
	const pattern = keys.map(k => escapeRegex ? escapeRegexLiteral(k) : k).join('|');
	// Match placeholders with optional spaces
	const regex = new RegExp(`\\{\\{\\s*(${pattern})\\s*\\}\\}`, 'g');
	return buffer.replace(regex, (_, capturedKey) => {
		// Use the captured key exactly as in substitutions
		return substitutions[capturedKey] ?? _;
	});
}

/**
 * Generic wrapper for template strings to enable syntax highlighting in editors like Neovim.
 * 
 * Usage:
 *   const html = tag('html');
 *   const typ = tag('typst');
 *   const sql = tag('sql');
 *   const md = tag('markdown');
 */
export const tag =
	(_name: string) =>
		(s: TemplateStringsArray | string, ...values: any[]): string => {
			if (typeof s === 'string') return s;
			let result = '';
			for (let i = 0; i < s.length; i++) {
				result += s[i];
				if (i < values.length) result += String(values[i]);
			}
			return result;
		};

