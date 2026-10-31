import { execFileSync } from 'node:child_process';

export interface GitInfo {
	root: string;
	branch: string;
	sha: string;
	shortSha: string;
	exactTag?: string;
	dirty: boolean;
	remoteUrl?: string;
	commitDate: string;
}

function git(cwd: string, args: string[]): string {
	return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function gitOptional(cwd: string, args: string[]): string | undefined {
	try {
		return execFileSync('git', args, {
			cwd,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		}).trim();
	} catch {
		return undefined;
	}
}

export function readGitInfo(cwd: string): GitInfo {
	let root: string;
	try {
		root = git(cwd, ['rev-parse', '--show-toplevel']);
	} catch {
		throw new Error(`Not a git repository: ${cwd}`);
	}

	return {
		root,
		branch: git(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
		sha: git(root, ['rev-parse', 'HEAD']),
		shortSha: git(root, ['rev-parse', '--short', 'HEAD']),
		exactTag: gitOptional(root, ['describe', '--tags', '--exact-match', 'HEAD']),
		dirty: git(root, ['status', '--porcelain']).length > 0,
		remoteUrl: gitOptional(root, ['config', '--get', 'remote.origin.url']),
		commitDate: git(root, ['log', '-1', '--format=%cI'])
	};
}
