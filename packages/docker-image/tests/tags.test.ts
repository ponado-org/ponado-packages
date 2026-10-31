import { describe, expect, it } from 'vitest';
import { computeTags, expandVersionTag, variantSuffixFor, withVariant } from '../src/tags';

const sha = '8b2e841c1234567890abcdef';

describe('computeTags', () => {
	it('tags a prod release with version, minor, major, latest and sha', () => {
		const plan = computeTags({ version: '6.2.0', mode: 'prod', sha });
		expect(plan.tags).toEqual(['v6.2.0', 'v6.2', 'v6', 'latest', 'sha-8b2e841']);
		expect(plan.primaryTag).toBe('v6.2.0');
		expect(plan.isRelease).toBe(true);
		expect(plan.isPrerelease).toBe(false);
	});

	it('does not move major/minor/latest for a prerelease', () => {
		const plan = computeTags({ version: '6.2.0-rc.1', mode: 'prod', sha });
		expect(plan.tags).toEqual(['v6.2.0-rc.1', 'sha-8b2e841']);
		expect(plan.isPrerelease).toBe(true);
	});

	it('never creates a moving v0 tag for major zero', () => {
		const plan = computeTags({ version: '0.13.8', mode: 'prod', sha });
		expect(plan.tags).toEqual(['v0.13.8', 'v0.13', 'latest', 'sha-8b2e841']);
	});

	it('tags staging with the mode suffix, the mode name and sha', () => {
		const plan = computeTags({ version: '6.2.0', mode: 'staging', sha });
		expect(plan.tags).toEqual(['v6.2.0-staging', 'staging', 'sha-8b2e841']);
		expect(plan.primaryTag).toBe('v6.2.0-staging');
	});

	it('adds latest to staging when the mode asks for it', () => {
		const plan = computeTags({ version: '6.2.0', mode: 'staging', sha, latest: true });
		expect(plan.tags).toEqual(['v6.2.0-staging', 'staging', 'latest', 'sha-8b2e841']);
	});

	it('tags dev with the mode suffix and the mode name', () => {
		const plan = computeTags({ version: '6.2.0', mode: 'dev', sha });
		expect(plan.tags).toEqual(['v6.2.0-dev', 'dev', 'sha-8b2e841']);
	});

	it('respects an explicit non-semver tag', () => {
		const plan = computeTags({ version: '6.2.0', mode: 'prod', sha, explicitTag: 'stable' });
		expect(plan.tags).toEqual(['stable', 'latest', 'sha-8b2e841']);
	});

	it('supports the floating major tag asked for in production', () => {
		const plan = computeTags({ version: '6.2.0', mode: 'prod', sha, explicitTag: 'v2' });
		expect(plan.tags).toEqual(['v2', 'latest', 'sha-8b2e841']);
	});

	it('keeps the explicit prefix when the tag has no v', () => {
		const plan = computeTags({ version: '6.2.0', mode: 'prod', sha, explicitTag: '6.2.0' });
		expect(plan.tags).toEqual(['6.2.0', '6.2', '6', 'latest', 'sha-8b2e841']);
	});

	it('can disable floating tags', () => {
		const plan = computeTags({ version: '6.2.0', mode: 'prod', sha, floating: false });
		expect(plan.tags).toEqual(['v6.2.0', 'latest', 'sha-8b2e841']);
	});

	it('can disable latest', () => {
		const plan = computeTags({ version: '6.2.0', mode: 'prod', sha, latest: false });
		expect(plan.tags).toEqual(['v6.2.0', 'v6.2', 'v6', 'sha-8b2e841']);
	});

	it('can disable the sha tag', () => {
		const plan = computeTags({ version: '6.2.0', mode: 'prod', sha, shaTag: false });
		expect(plan.tags).toEqual(['v6.2.0', 'v6.2', 'v6', 'latest']);
	});

	it('adds extra tags', () => {
		const plan = computeTags({ version: '6.2.0', mode: 'prod', sha, extraTags: ['stable'] });
		expect(plan.tags).toEqual(['v6.2.0', 'v6.2', 'v6', 'latest', 'stable', 'sha-8b2e841']);
	});

	it('applies a variant suffix to every tag', () => {
		const plan = computeTags({
			version: '6.2.0',
			mode: 'prod',
			sha,
			variantSuffix: '-alpine'
		});
		expect(plan.tags).toEqual([
			'v6.2.0-alpine',
			'v6.2-alpine',
			'v6-alpine',
			'latest-alpine',
			'sha-8b2e841-alpine'
		]);
		expect(plan.primaryTag).toBe('v6.2.0-alpine');
	});

	it('does not double the suffix', () => {
		const plan = computeTags({
			version: '6.2.0',
			mode: 'prod',
			sha,
			explicitTag: 'v6.2.0-alpine',
			variantSuffix: '-alpine'
		});
		expect(plan.primaryTag).toBe('v6.2.0-alpine');
		expect(plan.tags.filter((tag) => tag === 'v6.2.0-alpine')).toHaveLength(1);
	});

	it('deduplicates an explicit latest tag', () => {
		const plan = computeTags({ version: '6.2.0', mode: 'prod', sha, explicitTag: 'latest' });
		expect(plan.tags).toEqual(['latest', 'sha-8b2e841']);
	});
});

describe('expandVersionTag', () => {
	const context = {
		version: '7.0.0',
		mode: 'staging',
		sha,
		shortSha: sha.slice(0, 7),
		revision: sha,
		build: '12'
	};

	it('expands version, mode, sha and build tokens', () => {
		expect(expandVersionTag('v{version}-rc.{build}', context)).toBe('v7.0.0-rc.12');
		expect(expandVersionTag('v{version}-{mode}.{shortSha}', context)).toBe(
			'v7.0.0-staging.8b2e841'
		);
		expect(expandVersionTag('v{version}-{revision}', context)).toBe(`v7.0.0-${sha}`);
	});

	it('requires a build number for {build}', () => {
		expect(() => expandVersionTag('v{version}-rc.{build}', { ...context, build: undefined })).toThrow(
			/BUILD_NUMBER/
		);
	});

	it('rejects tags Docker would not accept', () => {
		expect(() => expandVersionTag('v{version} bad', context)).toThrow(/Invalid versionTag/);
	});
});

describe('variant helpers', () => {
	it('derives a suffix from the Dockerfile variant name', () => {
		expect(variantSuffixFor('Dockerfile')).toBe('');
		expect(variantSuffixFor('Dockerfile.alpine')).toBe('-alpine');
		expect(variantSuffixFor('Dockerfile.debian')).toBe('-debian');
		expect(variantSuffixFor('docker/Dockerfile-alpine')).toBe('-alpine');
		expect(variantSuffixFor('Dockerfile.custom')).toBe('-custom');
	});

	it('applies a suffix only once', () => {
		expect(withVariant('v6', '-alpine')).toBe('v6-alpine');
		expect(withVariant('v6-alpine', '-alpine')).toBe('v6-alpine');
		expect(withVariant('v6', '')).toBe('v6');
	});
});
