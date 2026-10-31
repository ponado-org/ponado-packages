import { spawnSync } from 'node:child_process';

export interface Command {
	bin: string;
	args: string[];
}

export interface BuildCommandOptions {
	primary: string;
	tags: string[];
	platforms: string[];
	dockerfile: string;
	buildArgs: Record<string, string>;
	secrets: string[];
	labels: Record<string, string>;
	push: boolean;
	noCache: boolean;
	cacheFrom: string[];
	cacheTo: string[];
	context: string;
}

export function buildCommand(options: BuildCommandOptions): Command {
	const args = [
		'buildx',
		'build',
		'--file',
		options.dockerfile,
		'--platform',
		options.platforms.join(',')
	];
	args.push(options.push ? '--push' : '--load');

	for (const tag of options.tags) args.push('--tag', `${options.primary}:${tag}`);
	for (const [key, value] of Object.entries(options.buildArgs)) {
		args.push('--build-arg', `${key}=${value}`);
	}
	for (const secret of options.secrets) args.push('--secret', secret);
	for (const [key, value] of Object.entries(options.labels)) {
		args.push('--label', `${key}=${value}`);
	}

	if (options.noCache) args.push('--no-cache');
	for (const spec of options.cacheFrom) args.push('--cache-from', spec);
	for (const spec of options.cacheTo) args.push('--cache-to', spec);
	args.push(options.context);

	return { bin: 'docker', args };
}

export function mirrorCommand(
	primary: string,
	primaryTag: string,
	mirror: string,
	tags: string[]
): Command {
	const args = ['buildx', 'imagetools', 'create'];
	for (const tag of tags) args.push('--tag', `${mirror}:${tag}`);
	args.push(`${primary}:${primaryTag}`);
	return { bin: 'docker', args };
}

export function formatCommand(command: Command): string {
	return [command.bin, ...command.args].map(shellQuote).join(' ');
}

export function runCommand(command: Command, cwd: string): void {
	const result = spawnSync(command.bin, command.args, { cwd, stdio: 'inherit' });
	if (result.error) {
		throw new Error(`Failed to run ${command.bin}: ${result.error.message}`);
	}
	if (result.status !== 0) {
		throw new Error(
			`${command.bin} ${command.args[0] ?? ''} exited with code ${result.status ?? 'unknown'}`
		);
	}
}

function shellQuote(value: string): string {
	if (/^[A-Za-z0-9_./:=@%+-]+$/.test(value)) return value;
	return `'${value.replaceAll("'", `'\\''`)}'`;
}
