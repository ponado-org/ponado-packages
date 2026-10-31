const SEMVER_RE = /^(v?)(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export interface TagOptions {
	/** package.json version, e.g. "6.2.0" */
	version: string;
	/** Mode name, e.g. "prod", "staging", "dev" */
	mode: string;
	/** Full git commit SHA */
	sha: string;
	/** Explicit version tag; overrides the mode default */
	explicitTag?: string;
	/** Add `latest` (default: true for prod) */
	latest?: boolean;
	/** Add moving `v<major>` / `v<major>.<minor>` / mode tags */
	floating?: boolean;
	/** Add `sha-<short>` */
	shaTag?: boolean;
	/** Additional tags, e.g. ["stable"] */
	extraTags?: string[];
	/** Variant suffix, e.g. "-alpine" */
	variantSuffix?: string;
}

export interface TagPlan {
	/** Immutable tag identifying this build; the mirror source */
	primaryTag: string;
	/** Every tag to attach, in priority order */
	tags: string[];
	/** Canonical version tag before the variant suffix */
	versionTag: string;
	isRelease: boolean;
	isPrerelease: boolean;
	shortSha: string;
}

export interface VersionTagContext {
	/** package.json / VERSION value, e.g. "7.0.0" */
	version: string;
	/** Mode name, e.g. "staging" */
	mode: string;
	/** Short git SHA */
	sha: string;
	/** Short git SHA alias */
	shortSha: string;
	/** Full git revision */
	revision: string;
	/** External build number (BUILD_NUMBER / GITHUB_RUN_NUMBER) */
	build?: string;
}

const VERSION_TAG_TOKEN_RE = /\{(version|mode|sha|shortSha|revision|build)\}/g;
const DOCKER_TAG_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;

/**
 * Expands a configured `versionTag` template.
 *
 *   v{version}-rc.{build}  ->  v7.0.0-rc.12
 *   v{version}-{shortSha}  ->  v7.0.0-8b2e841
 *
 * `{build}` is required for release-candidate numbering; it comes from
 * `BUILD_NUMBER` or `GITHUB_RUN_NUMBER` (see `envBuildNumber`).
 */
export function expandVersionTag(template: string, context: VersionTagContext): string {
	const tag = template.replace(VERSION_TAG_TOKEN_RE, (_match, token: string) => {
		if (token === 'build') {
			if (!context.build) {
				throw new Error(
					'versionTag uses {build}, but BUILD_NUMBER/GITHUB_RUN_NUMBER is not set'
				);
			}
			return context.build;
		}
		return context[token as keyof VersionTagContext] as string;
	});
	if (!DOCKER_TAG_RE.test(tag)) {
		throw new Error(
			`Invalid versionTag "${tag}": expected a Docker tag (letters, digits, ".", "_" or "-")`
		);
	}
	return tag;
}

/** Build number from the environment, used by the `{build}` token. */
export function envBuildNumber(): string | undefined {
	return (process.env.BUILD_NUMBER ?? process.env.GITHUB_RUN_NUMBER)?.trim() || undefined;
}

/**
 * Tag policy:
 *
 *   prod release v6.2.0   -> v6.2.0, v6.2, v6, latest, sha-<short>
 *   prod prerelease       -> v6.2.0-rc.1, sha-<short>
 *   staging               -> v6.2.0-staging, staging, sha-<short>
 *   dev / other modes     -> v6.2.0-dev, dev, sha-<short>
 *
 * Major zero (`v0.x.y`) never gets a moving `v0` tag.
 */
export function computeTags(options: TagOptions): TagPlan {
	const { version, mode, explicitTag, variantSuffix = '' } = options;
	const short = shortSha(options.sha);
	const latest = options.latest ?? mode === 'prod';
	const floating = options.floating ?? true;
	const shaTag = options.shaTag ?? true;

	const versionTag = explicitTag ?? defaultVersionTag(version, mode);
	const match = SEMVER_RE.exec(versionTag);
	const isRelease = Boolean(match && !match[5]);
	const isPrerelease = Boolean(match && match[5]);

	const tags: string[] = [versionTag];

	if (match && isRelease && mode === 'prod' && floating) {
		const prefix = match[1];
		const major = Number(match[2]);
		const minor = Number(match[3]);
		tags.push(`${prefix}${major}.${minor}`);
		if (major > 0) tags.push(`${prefix}${major}`);
	}

	if (mode !== 'prod' && floating) tags.push(mode);
	if (latest && (mode !== 'prod' || !isPrerelease)) tags.push('latest');
	for (const extra of options.extraTags ?? []) tags.push(extra);
	if (shaTag) tags.push(`sha-${short}`);

	const suffixed = tags.map((tag) => withVariant(tag, variantSuffix));

	return {
		primaryTag: withVariant(versionTag, variantSuffix),
		tags: [...new Set(suffixed)],
		versionTag,
		isRelease,
		isPrerelease,
		shortSha: short
	};
}

export function defaultVersionTag(version: string, mode: string): string {
	return mode === 'prod' ? `v${version}` : `v${version}-${mode}`;
}

export function shortSha(sha: string): string {
	return sha.slice(0, 7);
}

export function withVariant(tag: string, suffix: string): string {
	if (!suffix) return tag;
	return tag.endsWith(suffix) ? tag : `${tag}${suffix}`;
}

export function variantSuffixFor(dockerfile: string): string {
	const match = /Dockerfile[.-]([A-Za-z0-9-]+)$/.exec(dockerfile);
	return match ? `-${match[1].toLowerCase()}` : '';
}
