#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
	confirmBuild,
	createPromptSession,
	promptForBuild,
	type PromptSession
} from './interactive.js';
import {
	createBuildPlan,
	executeBuildPlan,
	printPlan,
	serializePlan,
	type BuildOptions
} from './plan.js';

const HELP = `@ponado/docker-image — build, tag and mirror Docker images

Usage:
  ponado-docker-image [build] [tag] [options]
  ponado-docker-image tags [tag] [options]
  ponado-docker-image            # interactive when run in a terminal

Commands:
  build   Build and push (default)
  tags    Print the computed tags, one per line

Options:
  -i, --interactive        Prompt for mode, tag, push and mirrors
      --no-interactive     Never prompt
  -y, --yes                Skip the final confirmation
  -m, --mode <name>        Mode from package.json "dockerImage.modes" (default: dev)
  -t, --tag <tag>          Override the immutable version tag
      --extra-tag <tag>    Additional tag (repeatable), e.g. stable
      --image <ref>        Primary image ref (host/namespace/name)
      --mirror <ref>       Additional registry ref (repeatable)
      --platform <list>    Comma-separated platforms (repeatable)
      --dockerfile <path>  Dockerfile (default: Dockerfile)
      --build-arg <K=V>    Build arg (repeatable)
      --secret <spec>      Build secret (repeatable)
      --cache-from <spec>  Registry cache source (repeatable)
      --cache-to <spec>    Registry cache target (repeatable)
      --no-latest          Do not add the latest tag
      --no-floating        Do not add v<major> / v<major>.<minor> / mode tags
      --no-sha-tag         Do not add the sha-<short> tag
      --no-push            Build locally with --load
      --no-mirror          Skip mirroring to secondary registries
      --no-cache           Disable the Docker build cache
      --allow-dirty        Allow a dirty working tree for prod
      --allow-untagged     Allow an untagged HEAD for prod
      --allow-branch       Allow a non-main branch for prod
      --dry-run            Print the plan and commands, do not build
      --json               Print the plan as JSON and exit
  -h, --help               Show this help
  -v, --version            Show the CLI version

Config (package.json):
  {
    "dockerImage": {
      "platforms": ["linux/arm64"],
      "dockerfile": "Dockerfile",
      "secrets": ["id=npmrc,src=\${HOME}/.npmrc"],
      "modes": {
        "prod": {
          "targets": ["git.ponado.lt/ponado/app", "ghcr.io/ponado/app"],
          "buildArgs": { "APP_MODE": "prod" },
          "branch": "main",
          "requireTag": true
        }
      }
    }
  }

Tag policy:
  prod release v6.2.0   -> v6.2.0, v6.2, v6, latest, sha-<short>
  prod prerelease       -> v6.2.0-rc.1, sha-<short>
  staging (latest: true) -> v6.2.0-staging, staging, latest, sha-<short>
  other modes           -> v6.2.0-dev, dev, sha-<short>
  Dockerfile.<variant>  -> every tag gets -<variant>

The first target is built and pushed once. The rest are mirrored from it with
"docker buildx imagetools create", so every registry gets the same digest.`;

async function main(): Promise<void> {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		allowPositionals: true,
		options: {
			mode: { type: 'string', short: 'm' },
			tag: { type: 'string', short: 't' },
			'extra-tag': { type: 'string', multiple: true },
			image: { type: 'string' },
			mirror: { type: 'string', multiple: true },
			platform: { type: 'string', multiple: true },
			dockerfile: { type: 'string' },
			'build-arg': { type: 'string', multiple: true },
			secret: { type: 'string', multiple: true },
			'cache-from': { type: 'string', multiple: true },
			'cache-to': { type: 'string', multiple: true },
			latest: { type: 'boolean' },
			'no-latest': { type: 'boolean' },
			'no-floating': { type: 'boolean' },
			'no-sha-tag': { type: 'boolean' },
			push: { type: 'boolean' },
			'no-push': { type: 'boolean' },
			'no-mirror': { type: 'boolean' },
			'no-cache': { type: 'boolean' },
			'allow-dirty': { type: 'boolean' },
			'allow-untagged': { type: 'boolean' },
			'allow-branch': { type: 'boolean' },
			'dry-run': { type: 'boolean' },
			json: { type: 'boolean' },
			interactive: { type: 'boolean', short: 'i' },
			'no-interactive': { type: 'boolean' },
			yes: { type: 'boolean', short: 'y' },
			help: { type: 'boolean', short: 'h' },
			version: { type: 'boolean', short: 'v' }
		}
	});

	const first = positionals[0];
	const command =
		first === 'build' || first === 'tags' || first === 'help' ? positionals.shift()! : 'build';

	if (values.help || command === 'help') {
		console.log(HELP);
		return;
	}
	if (values.version) {
		console.log(readVersion());
		return;
	}

	let tag = values.tag ?? positionals[0];
	if (positionals.length > 1) {
		throw new Error(`Unexpected argument "${positionals[1]}"`);
	}

	let mirrors = values['no-mirror'] ? [] : values.mirror;
	let mode = values.mode;
	let dockerfile = values.dockerfile;
	let push = values['no-push'] ? false : values.push ? true : undefined;
	let promptSession: PromptSession | undefined;

	const autoInteractive =
		command === 'build' &&
		!mode &&
		!values['no-interactive'] &&
		!values.json &&
		Boolean(process.stdin.isTTY && process.stdout.isTTY);
	const interactive =
		!values['no-interactive'] && (Boolean(values.interactive) || autoInteractive);

	try {
		if (interactive) {
			promptSession = createPromptSession();
			const answers = await promptForBuild(
				{
					root: process.cwd(),
					mode,
					tag,
					dockerfile,
					push
				},
				promptSession
			);
			mode = answers.mode;
			tag = answers.tag;
			dockerfile = answers.dockerfile;
			push = answers.push;
			mirrors = answers.mirrors ?? mirrors;
		}

		const platforms = values.platform?.flatMap((platform) =>
			platform
				.split(',')
				.map((part) => part.trim())
				.filter(Boolean)
		);

		const buildArgs: Record<string, string> = {};
		for (const spec of values['build-arg'] ?? []) {
			const separator = spec.indexOf('=');
			if (separator <= 0)
				throw new Error(`Invalid --build-arg "${spec}" (expected KEY=VALUE)`);
			buildArgs[spec.slice(0, separator)] = spec.slice(separator + 1);
		}

		const options: BuildOptions = {
			root: process.cwd(),
			mode,
			tag,
			extraTags: values['extra-tag'],
			image: values.image,
			mirrors,
			platforms,
			dockerfile,
			buildArgs,
			secrets: values.secret,
			cacheFrom: values['cache-from'],
			cacheTo: values['cache-to'],
			latest: values['no-latest'] ? false : values.latest ? true : undefined,
			floating: values['no-floating'] ? false : undefined,
			shaTag: values['no-sha-tag'] ? false : undefined,
			push,
			noCache: Boolean(values['no-cache']),
			allowDirty: Boolean(values['allow-dirty']),
			allowUntagged: Boolean(values['allow-untagged']),
			allowBranch: Boolean(values['allow-branch'])
		};

		const plan = createBuildPlan(options);

		if (command === 'tags') {
			if (values.json) {
				console.log(JSON.stringify(plan.tagPlan, null, 2));
			} else {
				for (const tagName of plan.tags) console.log(tagName);
			}
			return;
		}

		if (values.json) {
			console.log(JSON.stringify(serializePlan(plan), null, 2));
			return;
		}
		if (values['dry-run']) {
			printPlan(plan);
			return;
		}
		if (interactive && !values.yes) {
			if (!promptSession) throw new Error('Interactive session missing');
			printPlan(plan);
			const confirmed = await confirmBuild(
				promptSession,
				plan.push ? 'Build and push?' : 'Build locally?'
			);
			if (!confirmed) {
				console.log('Aborted.');
				return;
			}
		}
		executeBuildPlan(plan);
	} finally {
		promptSession?.close();
	}
}

function readVersion(): string {
	const packageJson = JSON.parse(
		readFileSync(new URL('../package.json', import.meta.url), 'utf8')
	) as { version: string };
	return packageJson.version;
}

main().catch((error) => {
	console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
});
