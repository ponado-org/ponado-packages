import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { expandEnv, hostPlatform, resolveConfig, validateTarget } from '../src/config';

const dirs: string[] = [];

function makePackage(pkg: unknown): string {
	const dir = mkdtempSync(path.join(tmpdir(), 'ponado-docker-image-config-'));
	dirs.push(dir);
	writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
	return dir;
}

afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('expandEnv', () => {
	it('expands ${VAR} and $VAR', () => {
		process.env.PONADO_IMAGE_TEST = 'value';
		expect(expandEnv('${PONADO_IMAGE_TEST}/x')).toBe('value/x');
		expect(expandEnv('$PONADO_IMAGE_TEST/x')).toBe('value/x');
		delete process.env.PONADO_IMAGE_TEST;
	});

	it('expands a leading tilde', () => {
		expect(expandEnv('~/.npmrc')).not.toContain('~');
	});

	it('fails on an unset variable', () => {
		expect(() => expandEnv('${PONADO_IMAGE_MISSING_XYZ}')).toThrow(/not set/);
	});
});

describe('validateTarget', () => {
	it('accepts a registry ref when pushing', () => {
		expect(() => validateTarget('ghcr.io/ponado/app', true)).not.toThrow();
		expect(() => validateTarget('localhost:5000/app', true)).not.toThrow();
	});

	it('rejects a bare name when pushing', () => {
		expect(() => validateTarget('app', true)).toThrow(/not a registry host/);
	});

	it('accepts a bare name for a local build', () => {
		expect(() => validateTarget('app', false)).not.toThrow();
	});

	it('rejects tags and uppercase', () => {
		expect(() => validateTarget('ghcr.io/ponado/app:v1', true)).toThrow();
		expect(() => validateTarget('ghcr.io/Ponado/app', true)).toThrow(/lowercase/);
	});
});

describe('resolveConfig', () => {
	it('falls back to a VERSION file when package.json has no version', () => {
		const root = makePackage({
			name: 'demo',
			dockerImage: { targets: ['demo'] }
		});
		writeFileSync(path.join(root, 'VERSION'), '0.1.2\n');

		expect(resolveConfig(root, { mode: 'dev' }).version).toBe('0.1.2');
	});

	it('fails when neither package.json version nor VERSION exists', () => {
		const root = makePackage({
			name: 'demo',
			dockerImage: { targets: ['demo'] }
		});

		expect(() => resolveConfig(root, { mode: 'dev' })).toThrow(/No version found/);
	});

	it('merges base config with a mode', () => {
		const root = makePackage({
			name: 'demo',
			version: '1.2.3',
			dockerImage: {
				platforms: ['linux/arm64'],
				dockerfile: 'Dockerfile',
				buildArgs: { SHARED: '1' },
				modes: {
					prod: {
						targets: ['git.example.com/ponado/demo', 'ghcr.io/ponado/demo'],
						buildArgs: { APP_MODE: 'prod' }
					}
				}
			}
		});

		const config = resolveConfig(root, { mode: 'prod' });
		expect(config.mode).toBe('prod');
		expect(config.primary).toBe('git.example.com/ponado/demo');
		expect(config.mirrors).toEqual(['ghcr.io/ponado/demo']);
		expect(config.buildArgs).toEqual({ SHARED: '1', APP_MODE: 'prod' });
		expect(config.platforms).toEqual(['linux/arm64']);
	});

	it('resolves tag policy overrides from the mode', () => {
		const root = makePackage({
			name: 'demo',
			version: '1.2.3',
			dockerImage: {
				modes: {
					staging: {
						targets: ['demo'],
						latest: false,
						floating: false,
						shaTag: false,
						versionTag: 'v{version}-rc.{build}',
						extraTags: ['staging']
					}
				}
			}
		});

		expect(resolveConfig(root, { mode: 'staging' })).toMatchObject({
			latest: false,
			floating: false,
			shaTag: false,
			versionTag: 'v{version}-rc.{build}',
			extraTags: ['staging']
		});
	});

	it('lets --image and --mirror override the config', () => {
		const root = makePackage({
			name: 'demo',
			version: '1.2.3',
			dockerImage: {
				modes: {
					prod: { targets: ['git.example.com/ponado/demo'] }
				}
			}
		});

		const config = resolveConfig(root, {
			mode: 'prod',
			image: 'ghcr.io/other/demo',
			mirrors: ['git.example.com/other/demo']
		});
		expect(config.targets).toEqual(['ghcr.io/other/demo', 'git.example.com/other/demo']);
	});

	it('uses the host platform for dev by default', () => {
		const root = makePackage({
			name: 'demo',
			version: '1.2.3',
			dockerImage: { targets: ['demo'] }
		});
		expect(resolveConfig(root, { mode: 'dev' }).platforms).toEqual([hostPlatform()]);
	});

	it('uses the host platform for dev even when a default is configured', () => {
		const root = makePackage({
			name: 'demo',
			version: '1.2.3',
			dockerImage: { targets: ['demo'], platforms: ['linux/arm64'] }
		});
		expect(resolveConfig(root, { mode: 'dev' }).platforms).toEqual([hostPlatform()]);
	});

	it('fails when no target is configured', () => {
		const root = makePackage({ name: 'demo', version: '1.2.3' });
		expect(() => resolveConfig(root, { mode: 'prod' })).toThrow(/No Docker image targets/);
	});
});
