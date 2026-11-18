import { createInterface } from 'node:readline/promises';
import { readPackageJson, readVersion, resolveConfig } from './config.js';
import { readGitInfo } from './git.js';
import { computeTags, envBuildNumber, expandVersionTag, variantSuffixFor } from './tags.js';

export interface PromptSession {
	ask(question: string, fallback: string): Promise<string>;
	askYesNo(question: string, defaultValue: boolean): Promise<boolean>;
	close(): void;
}

export interface PromptOptions {
	root: string;
	mode?: string;
	tag?: string;
	dockerfile?: string;
	push?: boolean;
}

export interface PromptAnswers {
	mode: string;
	tag: string;
	dockerfile: string;
	push: boolean;
	mirrors?: string[];
}

export function createPromptSession(): PromptSession {
	const terminal = Boolean(process.stdin.isTTY);
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal
	});
	const iterator = rl[Symbol.asyncIterator]();
	const onSigint = () => {
		rl.close();
		process.exit(130);
	};
	rl.on('SIGINT', onSigint);

	let closed = false;
	const close = () => {
		if (closed) return;
		closed = true;
		rl.off('SIGINT', onSigint);
		rl.close();
	};

	return {
		async ask(question, fallback) {
			process.stdout.write(`? ${question} [${fallback}]: `);
			const { value, done } = await iterator.next();
			if (done) throw new Error('Aborted with Ctrl+D');
			if (!terminal) process.stdout.write('\n');
			return value.trim() || fallback;
		},
		async askYesNo(question, defaultValue) {
			const hint = defaultValue ? 'Y/n' : 'y/N';
			process.stdout.write(`? ${question} [${hint}]: `);
			const { value, done } = await iterator.next();
			if (done) throw new Error('Aborted with Ctrl+D');
			if (!terminal) process.stdout.write('\n');
			const answer = value.trim().toLowerCase();
			if (!answer) return defaultValue;
			return answer === 'y' || answer === 'yes';
		},
		close
	};
}

export async function promptForBuild(
	options: PromptOptions,
	prompt: PromptSession
): Promise<PromptAnswers> {
	const git = readGitInfo(options.root);
	const packageJson = readPackageJson(git.root);
	const modes = Object.keys(packageJson.dockerImage?.modes ?? {});
	if (modes.length === 0) {
		throw new Error('No dockerImage.modes configured in package.json');
	}

	let mode = options.mode;
	if (mode) {
		if (!modes.includes(mode)) {
			throw new Error(`Unknown mode "${mode}" (expected one of: ${modes.join(', ')})`);
		}
		console.log(`  mode: ${mode}`);
	} else {
		mode = await askMode(
			prompt,
			modes,
			defaultMode(modes, packageJson.dockerImage?.defaultMode)
		);
	}

	const dockerfile = options.dockerfile ?? packageJson.dockerImage?.dockerfile ?? 'Dockerfile';
	const config = resolveConfig(git.root, { mode, dockerfile });

	let tag = options.tag;
	if (!tag) {
		const version = readVersion(git.root, packageJson);
		const defaultTag = config.versionTag
			? expandVersionTag(config.versionTag, {
					version,
					mode,
					sha: git.shortSha,
					shortSha: git.shortSha,
					revision: git.sha,
					build: envBuildNumber()
				})
			: computeTags({
					version,
					mode,
					sha: git.sha,
					variantSuffix: variantSuffixFor(dockerfile)
				}).versionTag;
		tag = await prompt.ask('Tag', defaultTag);
	}

	console.log(`  primary: ${config.primary}`);
	if (config.mirrors.length > 0) {
		console.log(`  mirrors: ${config.mirrors.join(', ')}`);
	}

	if (options.push === undefined && mode === 'dev') {
		return { mode, tag, dockerfile, push: false, mirrors: [] };
	}

	const push = options.push ?? defaultPush(mode);
	if (options.push !== undefined) {
		return { mode, tag, dockerfile, push, mirrors: undefined };
	}

	const shouldPush = await prompt.askYesNo(
		`Push to ${config.primary}${config.mirrors.length > 0 ? ' (+ mirrors)' : ''}?`,
		push
	);
	if (!shouldPush) {
		return { mode, tag, dockerfile, push: false, mirrors: [] };
	}

	let mirrors: string[] | undefined;
	if (config.mirrors.length > 0) {
		const shouldMirror = await prompt.askYesNo(`Mirror to ${config.mirrors.join(', ')}?`, true);
		if (!shouldMirror) mirrors = [];
	}
	return { mode, tag, dockerfile, push: true, mirrors };
}

export async function confirmBuild(prompt: PromptSession, question: string): Promise<boolean> {
	return prompt.askYesNo(question, true);
}

export function defaultMode(modes: string[], configured?: string): string {
	if (configured && modes.includes(configured)) return configured;
	if (modes.includes('dev')) return 'dev';
	return modes[0];
}

export function parseModeAnswer(answer: string, modes: string[]): string {
	const value = answer.trim();
	const index = Number(value);
	if (Number.isInteger(index) && index >= 1 && index <= modes.length) {
		return modes[index - 1];
	}
	if (modes.includes(value)) return value;
	throw new Error(`Unknown mode "${value}" (expected one of: ${modes.join(', ')})`);
}

export function defaultPush(mode: string): boolean {
	return mode !== 'dev';
}

async function askMode(prompt: PromptSession, modes: string[], fallback: string): Promise<string> {
	if (modes.length === 1) {
		console.log(`  mode: ${modes[0]}`);
		return modes[0];
	}
	console.log('  modes:');
	for (const [index, mode] of modes.entries()) {
		console.log(`    ${index + 1}) ${mode}`);
	}
	return parseModeAnswer(await prompt.ask('Mode', fallback), modes);
}
