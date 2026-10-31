export {
	computeTags,
	defaultVersionTag,
	envBuildNumber,
	expandVersionTag,
	shortSha,
	variantSuffixFor,
	withVariant
} from './tags.js';
export type { TagOptions, TagPlan, VersionTagContext } from './tags.js';

export {
	expandEnv,
	hostPlatform,
	readPackageJson,
	readVersion,
	resolveConfig,
	validateTarget
} from './config.js';
export type {
	ConfigOverrides,
	DockerImageConfig,
	DockerImageModeConfig,
	PackageJson,
	ResolvedConfig
} from './config.js';

export { readGitInfo } from './git.js';
export type { GitInfo } from './git.js';

export {
	confirmBuild,
	createPromptSession,
	defaultMode,
	defaultPush,
	parseModeAnswer,
	promptForBuild
} from './interactive.js';
export type { PromptAnswers, PromptOptions, PromptSession } from './interactive.js';

export { buildCommand, formatCommand, mirrorCommand, runCommand } from './docker.js';
export type { BuildCommandOptions, Command } from './docker.js';

export {
	createBuildPlan,
	executeBuildPlan,
	expandBuildArgs,
	printPlan,
	serializePlan
} from './plan.js';
export type { BuildArgContext, BuildOptions, BuildPlan } from './plan.js';
