/**
 * Creates a regex to match placeholder syntax
 */
export function createPlaceholderRegex({
	pattern,
	openDelimiter = '{{',
	closeDelimiter = '}}',
	allowWhitespace = true,
}: {

	/** Pattern to match specific keys (default: matches any key) */
	pattern?: string;
	/** Opening delimiter (default: '{{') */
	openDelimiter?: string;
	/** Closing delimiter (default: '}}') */
	closeDelimiter?: string;
	/** Whether to allow whitespace around the key (default: true) */
	allowWhitespace?: boolean;
}): RegExp {

	const keyPattern = pattern ?? '[^{}\\[\\]]+';
	const open = escapeRegexLiteral(openDelimiter);
	const close = escapeRegexLiteral(closeDelimiter);
	const ws = allowWhitespace ? '\\s*' : '';

	return new RegExp(`${open}${ws}(${keyPattern})${ws}${close}`, 'g');
}

export function escapeRegexLiteral(str: string) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex chars
}

export function substituteTemplate({
	template,
	substitutions,
	escapeRegex = true
}: {
	template: string;
	substitutions: Record<string, string>;
	escapeRegex?: boolean;
}) {
	if (!substitutions || Object.keys(substitutions).length === 0) return template;

	const keys = Object.keys(substitutions);
	const pattern = keys.map(k => escapeRegex ? escapeRegexLiteral(k) : k).join('|');
	const regex = createPlaceholderRegex({ pattern }); // Matches only specific keys

	return template.replace(regex, (_, capturedKey) => {
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
export const tag = (_name: string) => (s: TemplateStringsArray | string, ...values: any[]): string => {
	if (typeof s === 'string') return s;
	let result = '';
	for (let i = 0; i < s.length; i++) {
		result += s[i];
		if (i < values.length) result += String(values[i]);
	}
	return result;
};

