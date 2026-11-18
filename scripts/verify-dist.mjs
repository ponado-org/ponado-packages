#!/usr/bin/env node
/**
 * Packaging sanity check that does not need a network install.
 *
 * 1. Every file referenced by `exports` exists.
 * 2. Every bare import in `dist` is declared as a runtime dependency
 *    (`dependencies` / `peerDependencies` / `optionalDependencies`).
 *
 * Rule 2 is what catches the "imports a library nobody installs" class of bug.
 */
import { readFile, readdir, access } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import path from 'node:path';

const PACKAGES_DIR = path.join(import.meta.dirname, '..', 'packages');
const BUILTINS = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

const errors = [];

async function exists(file) {
	try {
		await access(file);
		return true;
	} catch {
		return false;
	}
}

function declaredRuntimeDeps(pkg) {
	return new Set([
		...Object.keys(pkg.dependencies ?? {}),
		...Object.keys(pkg.peerDependencies ?? {}),
		...Object.keys(pkg.optionalDependencies ?? {})
	]);
}

function packageNameOf(specifier) {
	if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
	return specifier.split('/')[0];
}

function importsOf(source) {
	const specifiers = new Set();
	const patterns = [
		/^import\s+(?:[^'"]|\n)*?from\s*['"]([^'"]+)['"]/gm,
		/^export\s+(?:[^'"]|\n)*?from\s*['"]([^'"]+)['"]/gm,
		/^import\s*['"]([^'"]+)['"]/gm,
		/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
	];
	for (const pattern of patterns) {
		for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
	}
	return specifiers;
}

async function walk(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) files.push(...(await walk(full)));
		else if (/\.(?:mjs|cjs|js)$/.test(entry.name)) files.push(full);
	}
	return files;
}

for (const entry of await readdir(PACKAGES_DIR, { withFileTypes: true })) {
	if (!entry.isDirectory()) continue;
	const dir = path.join(PACKAGES_DIR, entry.name);
	const pkgPath = path.join(dir, 'package.json');
	if (!(await exists(pkgPath))) continue;

	const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
	if (!pkg.exports) continue;

	const label = pkg.name;
	const runtimeDeps = declaredRuntimeDeps(pkg);

	for (const [subpath, target] of Object.entries(pkg.exports)) {
		const files = typeof target === 'string' ? [target] : Object.values(target);
		for (const file of files) {
			if (typeof file !== 'string' || !file.startsWith('./')) continue;
			if (!(await exists(path.join(dir, file)))) {
				errors.push(`${label} ${subpath}: exports points at missing ${file}`);
			}
		}
	}

	const distDir = path.join(dir, 'dist');
	if (!(await exists(distDir))) continue;
	for (const file of await walk(distDir)) {
		const source = await readFile(file, 'utf8');
		for (const specifier of importsOf(source)) {
			if (specifier.startsWith('.') || specifier.startsWith('/')) continue;
			if (specifier.includes('#')) continue;
			if (BUILTINS.has(specifier)) continue;
			const dep = packageNameOf(specifier);
			if (BUILTINS.has(dep) || builtinModules.includes(dep)) continue;
			if (!runtimeDeps.has(dep)) {
				errors.push(
					`${label}: ${path.relative(dir, file)} imports "${dep}", which is not declared in dependencies/peerDependencies`
				);
			}
		}
	}
}

if (errors.length > 0) {
	console.error('Packaging check failed:\n');
	for (const error of new Set(errors)) console.error(`  - ${error}`);
	process.exit(1);
}
console.log('Packaging check passed.');
