import path from 'node:path';
import {
	resolveConfig,
	validateTarget,
	type ConfigOverrides,
	type ResolvedConfig
} from './config.js';
import { readGitInfo, type GitInfo } from './git.js';
import {
	computeTags,
	envBuildNumber,
	expandVersionTag,
	variantSuffixFor,
	type TagPlan
} from './tags.js';
import { buildCommand, formatCommand, mirrorCommand, runCommand, type Command } from './docker.js';

export interface BuildOptions extends ConfigOverrides {
	root: string;
	tag?: string;
	extraTags?: string[];
	latest?: boolean;
	floating?: boolean;
	shaTag?: boolean;
	push?: boolean;
	noCache?: boolean;
	allowDirty?: boolean;
	allowUntagged?: boolean;
	allowBranch?: boolean;
}

export interface BuildPlan {
	root: string;
	mode: string;
	version: string;
	git: GitInfo;
	config: ResolvedConfig;
	primary: string;
	mirrors: string[];
	tagPlan: TagPlan;
	tags: string[];
	primaryTag: string;
	platforms: string[];
	dockerfile: string;
	buildArgs: Record<string, string>;
	secrets: string[];
	labels: Record<string, string>;
	push: boolean;
	noCache: boolean;
	cacheFrom: string[];
	cacheTo: string[];
	commands: Command[];
	warnings: string[];
}

function configuredVersionTag(config: ResolvedConfig, git: GitInfo): string | undefined {
	if (!config.versionTag) return undefined;
	return expandVersionTag(config.versionTag, {
		version: config.version,
		mode: config.mode,
		sha: git.shortSha,
		shortSha: git.shortSha,
		revision: git.sha,
		build: envBuildNumber()
	});
}

export function createBuildPlan(options: BuildOptions): BuildPlan {
	const git = readGitInfo(options.root);
	const config = resolveConfig(git.root, options);
	const push = options.push ?? config.mode !== 'dev';
	const warnings: string[] = [];

	if (!push && config.platforms.length > 1) {
		throw new Error('A local build (--no-push/--load) supports only one platform');
	}
	for (const target of config.targets) validateTarget(target, push);

	if (config.mode === 'prod') {
		const expectedTag = `v${config.version}`;
		const detached = git.branch === 'HEAD';
		const taggedRelease = git.exactTag === expectedTag;

		if (config.branch && !options.allowBranch) {
			if (detached && !taggedRelease) {
				throw new Error(
					`Refusing to build prod from a detached HEAD that is not tagged ${expectedTag}. ` +
						`Check out "${config.branch}" or pass --allow-branch.`
				);
			}
			if (!detached && git.branch !== config.branch) {
				throw new Error(
					`Refusing to build prod from branch "${git.branch}" (expected "${config.branch}"). ` +
						`Merge first or pass --allow-branch.`
				);
			}
		}
		if (config.requireTag && !options.allowUntagged) {
			if (!git.exactTag) {
				throw new Error(
					`Refusing to build prod from an untagged commit. Tag it ${expectedTag} ` +
						`(pnpm release) or pass --allow-untagged.`
				);
			}
			if (git.exactTag !== expectedTag) {
				throw new Error(
					`Refusing to build prod: HEAD is tagged "${git.exactTag}" but package.json is ` +
						`${config.version} (expected "${expectedTag}"). Bump the version or pass --allow-untagged.`
				);
			}
		}
		if (git.dirty && !options.allowDirty) {
			throw new Error(
				'Refusing to build prod from a dirty working tree. Commit or pass --allow-dirty.'
			);
		}
	} else if (git.dirty) {
		warnings.push(`Working tree is dirty; the image will not match ${git.shortSha}.`);
	}

	const tagPlan = computeTags({
		version: config.version,
		mode: config.mode,
		sha: git.sha,
		explicitTag: options.tag ?? configuredVersionTag(config, git),
		extraTags: [...(config.extraTags ?? []), ...(options.extraTags ?? [])],
		latest: options.latest ?? config.latest,
		floating: options.floating ?? config.floating,
		shaTag: options.shaTag ?? config.shaTag,
		variantSuffix: variantSuffixFor(config.dockerfile)
	});
	const buildArgs = expandBuildArgs(config.buildArgs, {
		version: config.version,
		tag: tagPlan.versionTag,
		sha: git.shortSha,
		revision: git.sha,
		mode: config.mode
	});
	const labels = buildLabels(config, git);
	const commands = [
		buildCommand({
			primary: config.primary,
			tags: tagPlan.tags,
			platforms: config.platforms,
			dockerfile: config.dockerfile,
			buildArgs,
			secrets: config.secrets,
			labels,
			push,
			noCache: options.noCache ?? false,
			cacheFrom: config.cacheFrom,
			cacheTo: config.cacheTo,
			context: '.'
		})
	];

	if (push) {
		for (const mirror of config.mirrors) {
			commands.push(mirrorCommand(config.primary, tagPlan.primaryTag, mirror, tagPlan.tags));
		}
	}

	return {
		root: config.root,
		mode: config.mode,
		version: config.version,
		git,
		config,
		primary: config.primary,
		mirrors: config.mirrors,
		tagPlan,
		tags: tagPlan.tags,
		primaryTag: tagPlan.primaryTag,
		platforms: config.platforms,
		dockerfile: config.dockerfile,
		buildArgs,
		secrets: config.secrets,
		labels,
		push,
		noCache: options.noCache ?? false,
		cacheFrom: config.cacheFrom,
		cacheTo: config.cacheTo,
		commands,
		warnings
	};
}

const BUILD_ARG_TOKEN_RE = /\{(version|tag|sha|revision|mode)\}/g;

export interface BuildArgContext {
	/** package.json / VERSION value, e.g. "0.1.2" */
	version: string;
	/** Immutable version tag before the variant suffix, e.g. "v0.1.2" */
	tag: string;
	/** Short git SHA, e.g. "8b2e841" */
	sha: string;
	/** Full git revision */
	revision: string;
	mode: string;
}

/**
 * Substitute `{version}`, `{tag}`, `{sha}`, `{revision}` and `{mode}` in
 * configured build args. Repos that bake the release into the binary (Go
 * `-ldflags`, Rust `--env`, Node `--define`) need the tag at build time, but
 * config is static JSON.
 */
export function expandBuildArgs(
	buildArgs: Record<string, string>,
	context: BuildArgContext
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(buildArgs).map(([key, value]) => [
			key,
			value.replace(
				BUILD_ARG_TOKEN_RE,
				(_match, token: keyof BuildArgContext) => context[token]
			)
		])
	);
}

export function printPlan(plan: BuildPlan): void {
	for (const warning of plan.warnings) console.warn(`⚠ ${warning}`);
	console.log(`mode:       ${plan.mode}`);
	console.log(`version:    ${plan.version}`);
	console.log(
		`git:        ${plan.git.exactTag ?? '(untagged)'} ${plan.git.shortSha} (${plan.git.branch})`
	);
	console.log(`primary:    ${plan.primary}`);
	console.log(`mirrors:    ${plan.mirrors.length > 0 ? plan.mirrors.join(', ') : '(none)'}`);
	console.log(`tags:       ${plan.tags.join(', ')}`);
	console.log(`platforms:  ${plan.platforms.join(', ')}`);
	console.log(`dockerfile: ${plan.dockerfile}`);
	console.log('');
	for (const command of plan.commands) console.log(formatCommand(command));
}

export function serializePlan(plan: BuildPlan): unknown {
	return {
		mode: plan.mode,
		version: plan.version,
		git: {
			branch: plan.git.branch,
			sha: plan.git.sha,
			shortSha: plan.git.shortSha,
			exactTag: plan.git.exactTag ?? null,
			dirty: plan.git.dirty
		},
		primary: plan.primary,
		mirrors: plan.mirrors,
		tags: plan.tags,
		primaryTag: plan.primaryTag,
		platforms: plan.platforms,
		dockerfile: plan.dockerfile,
		buildArgs: plan.buildArgs,
		secrets: plan.secrets,
		labels: plan.labels,
		push: plan.push,
		noCache: plan.noCache,
		cacheFrom: plan.cacheFrom,
		cacheTo: plan.cacheTo,
		commands: plan.commands.map((command) => formatCommand(command)),
		warnings: plan.warnings
	};
}

export function executeBuildPlan(plan: BuildPlan): void {
	for (const warning of plan.warnings) console.warn(`⚠ ${warning}`);
	console.log(
		`==> ${plan.mode} ${plan.tagPlan.versionTag} (${plan.git.shortSha}) -> ${plan.primary}`
	);
	console.log(`==> tags: ${plan.tags.join(', ')}`);
	if (plan.mirrors.length > 0) console.log(`==> mirrors: ${plan.mirrors.join(', ')}`);

	for (const command of plan.commands) {
		console.log(`==> ${formatCommand(command)}`);
		runCommand(command, plan.root);
	}

	console.log(`==> done: ${plan.primary} [${plan.tags.join(', ')}]`);
}

function buildLabels(config: ResolvedConfig, git: GitInfo): Record<string, string> {
	const labels: Record<string, string> = {
		'org.opencontainers.image.title': path.basename(config.primary),
		'org.opencontainers.image.version': config.version,
		'org.opencontainers.image.revision': git.sha,
		'org.opencontainers.image.created': new Date().toISOString()
	};
	if (config.packageJson.license) {
		labels['org.opencontainers.image.licenses'] = config.packageJson.license;
	}
	const repository = config.packageJson.repository;
	const url = typeof repository === 'string' ? repository : repository?.url;
	if (url) labels['org.opencontainers.image.source'] = url.replace(/^git\+/, '');
	return labels;
}
