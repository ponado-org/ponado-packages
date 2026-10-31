import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createBuildPlan } from '../src/plan';

const dirs: string[] = [];

function makeRepo(pkg: unknown, tag?: string): string {
	const dir = mkdtempSync(path.join(tmpdir(), 'ponado-docker-image-plan-'));
	dirs.push(dir);
	writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
	execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
	execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
	execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
	execFileSync('git', ['add', '.'], { cwd: dir });
	execFileSync('git', ['commit', '-qm', 'init'], { cwd: dir });
	if (tag) execFileSync('git', ['tag', tag], { cwd: dir });
	return dir;
}

function demoPackage() {
	return {
		name: 'demo',
		version: '1.2.3',
		license: 'MIT',
		dockerImage: {
			platforms: ['linux/arm64'],
			modes: {
				prod: {
					targets: ['git.example.com/ponado/demo', 'ghcr.io/ponado/demo'],
					buildArgs: { APP_MODE: 'prod' },
					branch: 'main',
					requireTag: true
				},
				staging: {
					targets: ['git.example.com/ponado/demo-staging'],
					buildArgs: { APP_MODE: 'staging' },
					latest: true
				}
			}
		}
	};
}

afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('createBuildPlan', () => {
	it('plans a prod build, then mirrors the immutable tag', () => {
		const root = makeRepo(demoPackage(), 'v1.2.3');
		const plan = createBuildPlan({ root, mode: 'prod' });

		expect(plan.push).toBe(true);
		expect(plan.tags).toEqual(['v1.2.3', 'v1.2', 'v1', 'latest', `sha-${plan.git.shortSha}`]);
		expect(plan.commands).toHaveLength(2);

		const build = plan.commands[0];
		expect(build.args).toContain('--push');
		expect(build.args).toContain('git.example.com/ponado/demo:v1.2.3');
		expect(build.args).toContain('APP_MODE=prod');

		const mirror = plan.commands[1];
		expect(mirror.args.slice(0, 3)).toEqual(['buildx', 'imagetools', 'create']);
		expect(mirror.args).toContain('ghcr.io/ponado/demo:v1.2.3');
		expect(mirror.args.at(-1)).toBe('git.example.com/ponado/demo:v1.2.3');
	});

	it('refuses a dirty prod tree', () => {
		const root = makeRepo(demoPackage(), 'v1.2.3');
		writeFileSync(path.join(root, 'dirty.txt'), 'x');
		expect(() => createBuildPlan({ root, mode: 'prod' })).toThrow(/dirty/);
	});

	it('refuses an untagged prod commit', () => {
		const root = makeRepo(demoPackage());
		expect(() => createBuildPlan({ root, mode: 'prod' })).toThrow(/untagged/);
	});

	it('refuses a prod tag that does not match package.json', () => {
		const root = makeRepo(demoPackage(), 'v1.2.2');
		expect(() => createBuildPlan({ root, mode: 'prod' })).toThrow(/expected "v1.2.3"/);
	});

	it('allows a detached HEAD at the matching release tag', () => {
		const root = makeRepo(demoPackage(), 'v1.2.3');
		execFileSync('git', ['checkout', '-q', '--detach', 'HEAD'], { cwd: root });
		const plan = createBuildPlan({ root, mode: 'prod' });
		expect(plan.git.branch).toBe('HEAD');
		expect(plan.git.exactTag).toBe('v1.2.3');
	});

	it('refuses a detached HEAD that is not the release tag', () => {
		const root = makeRepo(demoPackage(), 'v1.2.3');
		execFileSync('git', ['checkout', '-q', '--detach', 'HEAD'], { cwd: root });
		execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'next'], { cwd: root });
		expect(() => createBuildPlan({ root, mode: 'prod' })).toThrow(/detached HEAD/);
	});

	it('plans staging with its own latest and without mirrors', () => {
		const root = makeRepo(demoPackage(), 'v1.2.3');
		const plan = createBuildPlan({ root, mode: 'staging' });

		expect(plan.tags).toEqual([
			'v1.2.3-staging',
			'staging',
			'latest',
			`sha-${plan.git.shortSha}`
		]);
		expect(plan.commands).toHaveLength(1);
	});

	it('uses the configured versionTag, tag flags and extra tags', () => {
		const pkg = demoPackage();
		Object.assign(pkg.dockerImage.modes.staging, {
			latest: false,
			floating: false,
			shaTag: false,
			versionTag: 'v{version}-rc.{build}',
			extraTags: ['staging']
		});
		const previous = process.env.BUILD_NUMBER;
		process.env.BUILD_NUMBER = '12';
		try {
			const root = makeRepo(pkg, 'v1.2.3');
			const plan = createBuildPlan({ root, mode: 'staging' });

			expect(plan.tags).toEqual(['v1.2.3-rc.12', 'staging']);
			expect(plan.primaryTag).toBe('v1.2.3-rc.12');
		} finally {
			if (previous === undefined) delete process.env.BUILD_NUMBER;
			else process.env.BUILD_NUMBER = previous;
		}
	});

	it('lets --tag override the configured versionTag', () => {
		const pkg = demoPackage();
		Object.assign(pkg.dockerImage.modes.staging, {
			versionTag: 'v{version}-rc.{build}'
		});
		const root = makeRepo(pkg, 'v1.2.3');
		const plan = createBuildPlan({
			root,
			mode: 'staging',
			tag: 'v1.2.3-rc.2',
			latest: false,
			floating: false,
			shaTag: false
		});

		expect(plan.tags).toEqual(['v1.2.3-rc.2']);
	});

	it('uses --load for a local build', () => {
		const root = makeRepo(demoPackage(), 'v1.2.3');
		const plan = createBuildPlan({ root, mode: 'staging', push: false });

		expect(plan.push).toBe(false);
		expect(plan.commands).toHaveLength(1);
		expect(plan.commands[0].args).toContain('--load');
		expect(plan.commands[0].args).not.toContain('--push');
	});

	it('applies the alpine suffix to tags and the mirror source', () => {
		const root = makeRepo(demoPackage(), 'v1.2.3');
		const plan = createBuildPlan({
			root,
			mode: 'prod',
			dockerfile: 'Dockerfile.alpine'
		});

		expect(plan.tags).toContain('v1.2.3-alpine');
		expect(plan.tags).toContain('latest-alpine');
		expect(plan.primaryTag).toBe('v1.2.3-alpine');
		expect(plan.commands[1].args.at(-1)).toBe('git.example.com/ponado/demo:v1.2.3-alpine');
	});

	it('adds OCI labels', () => {
		const root = makeRepo(demoPackage(), 'v1.2.3');
		const plan = createBuildPlan({ root, mode: 'prod' });

		expect(plan.labels['org.opencontainers.image.version']).toBe('1.2.3');
		expect(plan.labels['org.opencontainers.image.revision']).toBe(plan.git.sha);
		expect(plan.labels['org.opencontainers.image.licenses']).toBe('MIT');
	});

	it('expands build-arg version tokens', () => {
		const pkg = demoPackage();
		Object.assign(pkg.dockerImage.modes.prod.buildArgs, {
			VERSION: '{version}',
			TAG: '{tag}',
			SHA: '{sha}',
			REVISION: '{revision}',
			MODE: '{mode}'
		});
		const root = makeRepo(pkg, 'v1.2.3');
		const plan = createBuildPlan({ root, mode: 'prod' });

		expect(plan.buildArgs).toMatchObject({
			APP_MODE: 'prod',
			VERSION: '1.2.3',
			TAG: 'v1.2.3',
			SHA: plan.git.shortSha,
			REVISION: plan.git.sha,
			MODE: 'prod'
		});
		expect(plan.commands[0].args).toContain('VERSION=1.2.3');
	});

	it('keeps the variant suffix out of the version tag token', () => {
		const pkg = demoPackage();
		Object.assign(pkg.dockerImage.modes.prod.buildArgs, { TAG: '{tag}' });
		const root = makeRepo(pkg, 'v1.2.3');
		const plan = createBuildPlan({ root, mode: 'prod', dockerfile: 'Dockerfile.alpine' });

		expect(plan.buildArgs.TAG).toBe('v1.2.3');
		expect(plan.primaryTag).toBe('v1.2.3-alpine');
	});
});
