import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

export interface DockerImageModeConfig {
	/** Full image refs. First = primary, rest = mirrors. */
	targets?: string[];
	/** Build args for this mode. */
	buildArgs?: Record<string, string>;
	/** Dockerfile override. */
	dockerfile?: string;
	/** Platform override. */
	platforms?: string[];
	/** Require this git branch (e.g. "main"). */
	branch?: string;
	/** Require HEAD to be tagged v<version>. */
	requireTag?: boolean;
	/** Add the `latest` tag for this mode (default: true for prod). */
	latest?: boolean;
	/** Add moving `v<major>` / `v<major>.<minor>` / mode tags (default: true). */
	floating?: boolean;
	/** Add `sha-<short>` (default: true). */
	shaTag?: boolean;
	/**
	 * Immutable version tag template. Tokens: `{version}`, `{mode}`, `{sha}`,
	 * `{shortSha}`, `{revision}`, `{build}`.
	 */
	versionTag?: string;
	/** Extra tags for this mode, e.g. ["staging"]. */
	extraTags?: string[];
}

export interface DockerImageConfig {
	/** Default targets when a mode doesn't define them. */
	targets?: string[];
	/** Default build args. */
	buildArgs?: Record<string, string>;
	/** Default Dockerfile. */
	dockerfile?: string;
	/** Default platforms. */
	platforms?: string[];
	/** Build secrets, e.g. "id=npmrc,src=${HOME}/.npmrc". */
	secrets?: string[];
	/** Registry cache import specs. */
	cacheFrom?: string[];
	/** Registry cache export specs. */
	cacheTo?: string[];
	/** Mode used when --mode is omitted. */
	defaultMode?: string;
	/** Per-mode overrides. */
	modes?: Record<string, DockerImageModeConfig>;
}

export interface PackageJson {
	name?: string;
	version?: string;
	license?: string;
	repository?: string | { url?: string };
	dockerImage?: DockerImageConfig;
}

export interface ConfigOverrides {
	mode?: string;
	image?: string;
	mirrors?: string[];
	dockerfile?: string;
	platforms?: string[];
	buildArgs?: Record<string, string>;
	secrets?: string[];
	cacheFrom?: string[];
	cacheTo?: string[];
}

export interface ResolvedConfig {
	root: string;
	mode: string;
	version: string;
	packageJson: PackageJson;
	targets: string[];
	primary: string;
	mirrors: string[];
	dockerfile: string;
	platforms: string[];
	buildArgs: Record<string, string>;
	secrets: string[];
	cacheFrom: string[];
	cacheTo: string[];
	branch?: string;
	requireTag: boolean;
	latest?: boolean;
	floating?: boolean;
	shaTag?: boolean;
	versionTag?: string;
	extraTags?: string[];
}

export function readPackageJson(root: string): PackageJson {
	const file = path.join(root, 'package.json');
	let raw: string;
	try {
		raw = readFileSync(file, 'utf8');
	} catch {
		throw new Error(`No package.json found in ${root}`);
	}
	try {
		return JSON.parse(raw) as PackageJson;
	} catch (error) {
		throw new Error(`Invalid package.json in ${root}: ${(error as Error).message}`, {
			cause: error
		});
	}
}

/**
 * Version comes from package.json when present, otherwise from a plain
 * `VERSION` file at the repo root. The fallback keeps non-Node repos (Go,
 * Rust, Python) on a single source of truth instead of duplicating the
 * version into a package.json that exists only for this tool.
 */
export function readVersion(root: string, packageJson: PackageJson): string {
	if (packageJson.version) return packageJson.version;

	const file = path.join(root, 'VERSION');
	try {
		const version = readFileSync(file, 'utf8').trim();
		if (version) return version;
	} catch {
		// No VERSION file; fall through to the error below.
	}

	throw new Error(
		`No version found in ${root}: set "version" in package.json or add a VERSION file`
	);
}

export function resolveConfig(root: string, overrides: ConfigOverrides = {}): ResolvedConfig {
	const packageJson = readPackageJson(root);
	const version = readVersion(root, packageJson);

	const dockerImage = packageJson.dockerImage ?? {};
	const mode = overrides.mode ?? dockerImage.defaultMode ?? 'dev';
	const modeConfig = dockerImage.modes?.[mode] ?? {};

	let targets = modeConfig.targets ?? dockerImage.targets ?? [];
	if (overrides.image) {
		targets = [overrides.image, ...(overrides.mirrors ?? [])];
	} else if (overrides.mirrors !== undefined) {
		targets = targets.length > 0 ? [targets[0], ...overrides.mirrors] : overrides.mirrors;
	}
	if (targets.length === 0) {
		throw new Error(
			`No Docker image targets configured for mode "${mode}". ` +
				`Add dockerImage.modes.${mode}.targets to package.json or pass --image.`
		);
	}

	const dockerfile =
		overrides.dockerfile ?? modeConfig.dockerfile ?? dockerImage.dockerfile ?? 'Dockerfile';
	const platforms = overrides.platforms?.length
		? overrides.platforms
		: (modeConfig.platforms ??
			(mode === 'dev' ? [hostPlatform()] : (dockerImage.platforms ?? ['linux/arm64'])));

	const buildArgs = {
		...dockerImage.buildArgs,
		...modeConfig.buildArgs,
		...overrides.buildArgs
	};
	const secrets = (overrides.secrets ?? dockerImage.secrets ?? []).map(expandEnv);
	const cacheFrom = overrides.cacheFrom ?? dockerImage.cacheFrom ?? [];
	const cacheTo = overrides.cacheTo ?? dockerImage.cacheTo ?? [];

	return {
		root,
		mode,
		version,
		packageJson,
		targets,
		primary: targets[0],
		mirrors: targets.slice(1),
		dockerfile,
		platforms,
		buildArgs,
		secrets,
		cacheFrom,
		cacheTo,
		branch: modeConfig.branch,
		requireTag: modeConfig.requireTag ?? false,
		latest: modeConfig.latest,
		floating: modeConfig.floating,
		shaTag: modeConfig.shaTag,
		versionTag: modeConfig.versionTag,
		extraTags: modeConfig.extraTags
	};
}

const ARCH_ALIASES: Record<string, string> = {
	x64: 'amd64',
	arm64: 'arm64',
	arm: 'arm/v7',
	ia32: '386'
};

export function hostPlatform(): string {
	return `linux/${ARCH_ALIASES[process.arch] ?? process.arch}`;
}

export function expandEnv(value: string): string {
	const withHome = value.replace(/^~(?=$|\/)/, homedir());
	return withHome.replace(
		/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
		(_match, braced, bare) => {
			const key = (braced ?? bare) as string;
			const resolved = process.env[key];
			if (resolved === undefined) {
				throw new Error(`Environment variable ${key} is not set (used in "${value}")`);
			}
			return resolved;
		}
	);
}

const REPO_RE = /^[a-z0-9][a-z0-9._-]*(?::[0-9]+)?(?:\/[a-z0-9][a-z0-9._-]*)*$/;

export function validateTarget(ref: string, push: boolean): void {
	if (/\s/.test(ref)) {
		throw new Error(`Invalid image ref "${ref}": whitespace is not allowed`);
	}
	if (ref !== ref.toLowerCase()) {
		throw new Error(`Invalid image ref "${ref}": must be lowercase`);
	}
	if (ref.includes('@')) {
		throw new Error(`Invalid image ref "${ref}": digests are not supported here`);
	}
	if (!REPO_RE.test(ref)) {
		throw new Error(`Invalid image ref "${ref}": expected [host/]namespace/name without a tag`);
	}
	if (push) {
		const host = ref.split('/')[0];
		if (!host.includes('.') && !host.includes(':') && host !== 'localhost') {
			throw new Error(
				`Refusing to push to "${ref}": "${host}" is not a registry host. ` +
					`Use host/namespace/name or pass --no-push.`
			);
		}
	}
}
