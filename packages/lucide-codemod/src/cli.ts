#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { fixLucideImports } from './core.js';

const args = process.argv.slice(2);
const dry = args.includes('--dry') || args.includes('-n');
const dir = args.find((a) => !a.startsWith('-')) ?? 'src';

if (!existsSync(dir)) {
	console.error(`lucide-codemod: directory not found: ${dir}`);
	console.error('usage: lucide-codemod [dir] [--dry]');
	process.exit(1);
}

const results = await fixLucideImports(dir, { dry });

for (const { file, renames } of results) {
	const label = renames.map((r) => `${r.from}→${r.to}`).join(', ');
	console.log(`${dry ? 'would fix' : 'fixed'} ${file}: ${label || '(import paths only)'}`);
}
console.log(
	`${dry ? 'dry run: ' : ''}${results.length} file(s) ${dry ? 'would change' : 'changed'}`
);
