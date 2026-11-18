import { readFileSync, writeFileSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

/**
 * Rewrites @lucide/svelte imports to individual icon paths and normalizes the
 * local name to the `…Icon` convention (ShieldAlert → ShieldAlertIcon),
 * renaming every usage in the file.
 *
 * Safety: string literals and comments are never touched; in .svelte files
 * only tag names and `{…}` expressions are renamed (no text nodes, no
 * attribute strings). The transform is idempotent.
 */

export type Rename = { from: string; to: string };

export type TransformResult = {
	/** Transformed source (imports rewritten + usages renamed). */
	next: string;
	/** Identifier renames applied (old local name → new local name). */
	renames: Rename[];
};

export type FixResult = {
	file: string;
	renames: Rename[];
};

export type FixOptions = {
	/** Report what would change without writing. */
	dry?: boolean;
	/** File extensions to walk. Defaults to `.svelte`, `.ts`, `.js`, `.mts`, `.mjs`. */
	extensions?: Set<string>;
};

export const DEFAULT_EXTENSIONS = new Set(['.svelte', '.ts', '.js', '.mts', '.mjs']);

function toKebabCase(name: string): string {
	return name
		.replace(/Icon$/, '') // BanknoteIcon → Banknote
		.replace(
			/([A-Z])/g,
			(c: string, _: string, i: number) => (i > 0 ? '-' : '') + c.toLowerCase()
		);
}

// ---------------------------------------------------------------------------
// import rewriting
// ---------------------------------------------------------------------------

// Negative lookahead (?!\s+type\b) skips `import type { … }` block-level type imports.
const BARREL_RE = /import(?!\s+type\b)\s*\{([^}]+)\}\s*from\s*(['"])@lucide\/svelte\2;?/g;
const DIRECT_RE =
	/import(?!\s+type\b)\s+([A-Za-z_$][\w$]*)\s+from\s+(['"])@lucide\/svelte\/icons\/[^'"]+\2/g;

/** Named `X` / `X as Y` barrel specifiers → one direct import per icon. */
function transformBarrels(code: string, renames: Rename[]): string {
	return code.replace(
		BARREL_RE,
		(_match: string, specifiers: string, quote: string, offset: number) => {
			const indent = code.slice(code.lastIndexOf('\n', offset) + 1, offset);
			const lines: string[] = [];
			const leftovers: string[] = [];

			for (const raw of specifiers
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean)) {
				const clean = raw.replace(/^type\s+/, '');
				const [name = '', alias] = clean.split(/\s+as\s+/);
				const source = name.trim();
				const local = (alias ?? source).trim();
				const kebab = toKebabCase(source);

				// base `Icon` / `LucideIcon` have no per-icon path — keep them as-is
				if (!kebab || source === 'Icon' || source === 'LucideIcon') {
					leftovers.push(clean);
					continue;
				}

				const nextLocal = local.endsWith('Icon') ? local : `${local}Icon`;
				if (nextLocal !== local) renames.push({ from: local, to: nextLocal });
				lines.push(
					`import ${nextLocal} from ${quote}@lucide/svelte/icons/${kebab}${quote};`
				);
			}

			if (leftovers.length > 0)
				lines.push(
					`import { ${leftovers.join(', ')} } from ${quote}@lucide/svelte${quote};`
				);
			return lines.join('\n' + indent);
		}
	);
}

/** Direct icon imports whose local name lacks the Icon suffix. */
function transformDirect(code: string, renames: Rename[]): string {
	return code.replace(DIRECT_RE, (match: string, local: string) => {
		if (local.endsWith('Icon')) return match;
		const nextLocal = `${local}Icon`;
		renames.push({ from: local, to: nextLocal });
		return match.replace(local, nextLocal);
	});
}

// ---------------------------------------------------------------------------
// usage renaming (identifier-aware, skips strings + comments)
// ---------------------------------------------------------------------------

function skipQuoted(code: string, start: number, quote: string): number {
	let i = start + 1;
	while (i < code.length) {
		if (code[i] === '\\') {
			i += 2;
			continue;
		}
		if (code[i] === quote) return i + 1;
		i++;
	}
	return code.length;
}

/** Index of the `}` matching the `{` at openIndex, skipping strings/comments. */
function findMatchingBrace(code: string, openIndex: number): number {
	let depth = 0;
	let i = openIndex;
	while (i < code.length) {
		const ch = code[i];
		if (ch === '"' || ch === "'" || ch === '`') {
			i = skipQuoted(code, i, ch);
			continue;
		}
		if (ch === '/' && code[i + 1] === '/') {
			const j = code.indexOf('\n', i);
			i = j === -1 ? code.length : j;
			continue;
		}
		if (ch === '/' && code[i + 1] === '*') {
			const j = code.indexOf('*/', i + 2);
			i = j === -1 ? code.length : j + 2;
			continue;
		}
		if (ch === '{') depth++;
		else if (ch === '}') {
			depth--;
			if (depth === 0) return i;
		}
		i++;
	}
	return -1;
}

function renameCode(code: string, map: Map<string, string>): string {
	if (map.size === 0) return code;
	let out = '';
	let i = 0;
	while (i < code.length) {
		const ch = code[i];
		if (ch === '/' && code[i + 1] === '/') {
			const j = code.indexOf('\n', i);
			const end = j === -1 ? code.length : j;
			out += code.slice(i, end);
			i = end;
			continue;
		}
		if (ch === '/' && code[i + 1] === '*') {
			const j = code.indexOf('*/', i + 2);
			const end = j === -1 ? code.length : j + 2;
			out += code.slice(i, end);
			i = end;
			continue;
		}
		if (ch === '"' || ch === "'") {
			const end = skipQuoted(code, i, ch);
			out += code.slice(i, end);
			i = end;
			continue;
		}
		if (ch === '`') {
			// template literal: copy text, recurse into ${…}
			out += '`';
			i++;
			while (i < code.length) {
				if (code[i] === '\\') {
					out += code.slice(i, i + 2);
					i += 2;
					continue;
				}
				if (code[i] === '`') {
					out += '`';
					i++;
					break;
				}
				if (code[i] === '$' && code[i + 1] === '{') {
					const close = findMatchingBrace(code, i + 1);
					if (close === -1) {
						out += code.slice(i);
						i = code.length;
						break;
					}
					out += '${' + renameCode(code.slice(i + 2, close), map) + '}';
					i = close + 1;
					continue;
				}
				out += code[i];
				i++;
			}
			continue;
		}
		if (/[A-Za-z_$]/.test(ch)) {
			let j = i + 1;
			while (j < code.length && /[\w$]/.test(code[j])) j++;
			const word = code.slice(i, j);
			out += map.get(word) ?? word;
			i = j;
			continue;
		}
		out += ch;
		i++;
	}
	return out;
}

/** Markup-aware rename: tag names + `{…}` expressions, never text nodes or attrs. */
function renameSvelte(code: string, map: Map<string, string>): string {
	if (map.size === 0) return code;
	let out = '';
	let i = 0;
	while (i < code.length) {
		if (code.startsWith('<!--', i)) {
			const j = code.indexOf('-->', i + 4);
			const end = j === -1 ? code.length : j + 3;
			out += code.slice(i, end);
			i = end;
			continue;
		}
		if (code.startsWith('<script', i) && /[\s>]/.test(code[i + 7] ?? '')) {
			const openEnd = code.indexOf('>', i);
			const close = code.indexOf('</script', openEnd + 1);
			if (openEnd !== -1 && close !== -1) {
				out += code.slice(i, openEnd + 1);
				out += renameCode(code.slice(openEnd + 1, close), map);
				i = close;
				continue;
			}
		}
		if (code.startsWith('<style', i) && /[\s>]/.test(code[i + 6] ?? '')) {
			const close = code.indexOf('</style', i);
			const end = close === -1 ? code.length : close + '</style'.length;
			out += code.slice(i, end);
			i = end;
			continue;
		}
		if (code[i] === '<') {
			const nameStart = i + (code[i + 1] === '/' ? 2 : 1);
			const m = /^[A-Za-z][\w$]*/.exec(code.slice(nameStart));
			if (m) {
				const name = m[0];
				out += code.slice(i, nameStart);
				out += map.get(name) ?? name;
				i = nameStart + name.length;
				// rest of the tag: strings verbatim, {…} renamed
				while (i < code.length && code[i] !== '>') {
					if (code[i] === '"' || code[i] === "'") {
						const j = skipQuoted(code, i, code[i]);
						out += code.slice(i, j);
						i = j;
						continue;
					}
					if (code[i] === '{') {
						const close = findMatchingBrace(code, i);
						if (close === -1) {
							out += code.slice(i);
							i = code.length;
							break;
						}
						out += '{' + renameCode(code.slice(i + 1, close), map) + '}';
						i = close + 1;
						continue;
					}
					out += code[i];
					i++;
				}
				if (i < code.length) {
					out += '>';
					i++;
				}
				continue;
			}
		}
		if (code[i] === '{') {
			const close = findMatchingBrace(code, i);
			if (close === -1) {
				out += code.slice(i);
				break;
			}
			out += '{' + renameCode(code.slice(i + 1, close), map) + '}';
			i = close + 1;
			continue;
		}
		out += code[i];
		i++;
	}
	return out;
}

// ---------------------------------------------------------------------------
// per-file transform
// ---------------------------------------------------------------------------

/** Transform one file's source. Returns null when nothing needs to change. */
export function transformFile(code: string, file: string): TransformResult | null {
	if (!code.includes('@lucide/svelte')) return null;

	const found: Rename[] = [];
	let next = transformBarrels(code, found);
	next = transformDirect(next, found);

	const map = new Map<string, string>();
	const targets = new Set<string>();
	for (const { from, to } of found) {
		if (from === to) continue;
		if (map.has(from) && map.get(from) !== to) {
			console.warn(`⚠️  ${file}: conflicting renames for ${from} — skipped`);
			return null;
		}
		if (targets.has(to)) {
			console.warn(`⚠️  ${file}: rename collision on ${to} — skipped`);
			return null;
		}
		map.set(from, to);
		targets.add(to);
	}

	if (map.size > 0) {
		next = file.endsWith('.svelte') ? renameSvelte(next, map) : renameCode(next, map);
	}
	if (next === code) return null;

	return { next, renames: [...map].map(([from, to]) => ({ from, to })) };
}

// ---------------------------------------------------------------------------
// directory walk
// ---------------------------------------------------------------------------

/**
 * Rewrite every lucide import under `dir` in place (unless `dry`).
 * Returns the files that changed (or would change).
 */
export async function fixLucideImports(
	dir: string,
	options: FixOptions = {}
): Promise<FixResult[]> {
	const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
	const results: FixResult[] = [];

	async function walk(current: string) {
		for (const entry of await readdir(current)) {
			const full = join(current, entry);
			if ((await stat(full)).isDirectory()) {
				await walk(full);
				continue;
			}
			if (!extensions.has(extname(entry))) continue;

			const original = readFileSync(full, 'utf8');
			const result = transformFile(original, full);
			if (!result) continue;

			if (!options.dry) writeFileSync(full, result.next, 'utf8');
			results.push({ file: full, renames: result.renames });
		}
	}

	await walk(dir);
	return results;
}
