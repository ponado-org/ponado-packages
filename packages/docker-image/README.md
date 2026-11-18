# @ponado-org/docker-image

One shared build / tag / mirror policy for Docker images.

## Why

Every repo used to have its own `build-push.sh`. They drifted. This package owns
the part that must be identical everywhere:

- compute version tags from `package.json` + git tags;
- build and push **once** to the primary registry;
- mirror the same digest to the other registries with
  `docker buildx imagetools create`;
- refuse unsafe prod builds (wrong branch, dirty tree, untagged commit);
- add OCI labels.

The Docker build itself is still plain `docker buildx build`.

## Install

```bash
pnpm add -D @ponado-org/docker-image
```

## Configure

Add a `dockerImage` field to `package.json`:

```json
{
	"dockerImage": {
		"platforms": ["linux/arm64"],
		"dockerfile": "Dockerfile",
		"secrets": ["id=npmrc,src=${HOME}/.npmrc"],
		"modes": {
			"prod": {
				"targets": ["git.ponado.lt/ponado/mano-kakc", "ghcr.io/ponado/mano-kakc"],
				"buildArgs": { "APP_MODE": "prod" },
				"branch": "main",
				"requireTag": true
			},
			"staging": {
				"targets": ["git.ponado.lt/ponado/mano-kakc-staging"],
				"buildArgs": { "APP_MODE": "staging" },
				"versionTag": "v{version}-rc.{build}",
				"latest": false,
				"floating": false,
				"shaTag": false,
				"extraTags": ["staging"]
			},
			"dev": {
				"targets": ["mano-kakc"],
				"buildArgs": { "APP_MODE": "dev" }
			}
		}
	}
}
```

- `targets[0]` is the primary: built and pushed first.
- `targets[1..]` are mirrors: `docker buildx imagetools create` copies the same
  digest.
- `dev` builds default to `--load` and the host platform; everything else
  defaults to push and `linux/arm64`.
- `latest` is opt-in per mode (prod releases get it by default). A separate
  staging image can keep its own `latest` without touching prod.
- `floating` adds the moving `v<major>` / `v<major>.<minor>` / mode tags
  (default `true`).
- `shaTag` adds `sha-<short>` (default `true`).
- `versionTag` overrides the immutable tag template. Tokens: `{version}`,
  `{mode}`, `{sha}`, `{shortSha}`, `{revision}`, `{build}`. `{build}` comes from
  `BUILD_NUMBER` or `GITHUB_RUN_NUMBER`, so `v{version}-rc.{build}` produces
  `v6.2.0-rc.12`.
- `extraTags` appends tags for that mode, e.g. `["staging"]` when
  `floating: false`.
- CLI flags (`--no-latest`, `--no-floating`, `--no-sha-tag`, `--tag`,
  `--extra-tag`) override the mode config.
- `secrets` support `${VAR}`, `$VAR` and a leading `~`.
- `buildArgs` support `{version}`, `{tag}`, `{sha}`, `{revision}` and `{mode}`
  placeholders, expanded when the plan is created. `{version}` is `1.2.3`;
  `{tag}` is the immutable version tag (`v1.2.3`, `v1.2.3-staging`) without a
  Dockerfile variant suffix.

If `package.json` has no `version`, the CLI reads a plain `VERSION` file at the
repo root. That keeps Go/Rust/Python repos on one source of truth instead of
duplicating the version into a package.json that exists only for this tool.

## Use

```bash
pnpm exec ponado-docker-image                 # interactive
pnpm exec ponado-docker-image build --mode prod
pnpm exec ponado-docker-image build --mode staging
pnpm exec ponado-docker-image build --mode prod --dry-run
pnpm exec ponado-docker-image tags --mode prod
```

The tag can also be the first positional argument:

```bash
pnpm exec ponado-docker-image build v6.2.0 --mode prod
```

Add ad-hoc tags with `--extra-tag` (repeatable):

```bash
pnpm exec ponado-docker-image build --mode prod --extra-tag stable
```

`--image` overrides the primary ref; pass `--mirror` alongside it if you still
want mirrors. `--no-mirror` keeps the primary and drops the rest.

## Interactive mode

Run it without `--mode` in a terminal:

```bash
pnpm exec ponado-docker-image
```

It prompts for mode, tag, push and mirror, then shows the plan before building.
`--interactive` forces the prompts even when a mode is given;
`--no-interactive` disables them; `--yes` skips the final confirmation. In a
non-TTY (CI, pipes) it never prompts and uses the default mode.

## Tag policy

| Build                         | Tags                                                            |
| ----------------------------- | --------------------------------------------------------------- |
| prod `v6.2.0`                 | `v6.2.0`, `v6.2`, `v6`, `latest`, `sha-<short>`                 |
| prod prerelease `v6.2.0-rc.1` | `v6.2.0-rc.1`, `sha-<short>`                                    |
| staging (`latest: true`)      | `v6.2.0-staging`, `staging`, `latest`, `sha-<short>`            |
| staging `versionTag` + flags  | `v6.2.0-rc.12` (+ `extraTags`)                                  |
| dev / other modes             | `v6.2.0-dev`, `dev`, `sha-<short>`                              |
| `Dockerfile.<variant>`        | every tag gets `-<variant>` (plain `Dockerfile` gets no suffix) |

The immutable tag (`v6.2.0`) is what you pin in production. `v6`, `v6.2` and
`latest` are moving aliases. A prod prerelease never moves them, and major zero
never gets a moving `v0` tag.

## Prod guards

`mode: "prod"` enforces:

- branch must match `branch` (`main`);
- HEAD must be tagged `v<package.json version>`;
- working tree must be clean.

Override deliberately with `--allow-branch`, `--allow-untagged`, `--allow-dirty`.

CI note: use a full clone (`fetch-depth: 0`) so the release tag exists. A
detached HEAD at the matching `v<version>` tag is allowed; a detached HEAD
anywhere else is refused.

## Mirroring

Build once, mirror everywhere. The mirror step uses the immutable tag as the
source, so every registry gets the same manifest/digest:

```bash
docker buildx imagetools create \
  -t ghcr.io/ponado/mano-kakc:v6.2.0 \
  -t ghcr.io/ponado/mano-kakc:v6.2 \
  -t ghcr.io/ponado/mano-kakc:v6 \
  -t ghcr.io/ponado/mano-kakc:latest \
  git.ponado.lt/ponado/mano-kakc:v6.2.0
```

Log in to every target registry once:

```bash
docker login git.ponado.lt
docker login ghcr.io
```

`--no-mirror` skips the secondary registries.

## Registry cache

Optional, for CI or repeat builds:

```json
{
	"dockerImage": {
		"cacheFrom": ["type=registry,ref=git.ponado.lt/ponado/mano-kakc:cache"],
		"cacheTo": ["type=registry,ref=git.ponado.lt/ponado/mano-kakc:cache,mode=max"]
	}
}
```

## Multi-arch

Default is `linux/arm64`. Adding `linux/amd64` works, but the Dockerfile's
`prod-deps` stage runs `pnpm install --prod` on the target platform; on an arm64
builder that means QEMU emulation. Only add amd64 if a consumer needs it.

## Migrating a repo from build-push.sh

1. `pnpm add -D @ponado-org/docker-image`.
2. Copy the `dockerImage` config into `package.json` and change the image names.
3. Delete the repo's `build-push.sh`; the CLI replaces it:
   `pnpm exec ponado-docker-image --mode prod`.
4. Keep a release/version script only if it does more than pick a mode (bump a
   version file, create the git tag, push). Prefer a standard tool such as
   `bumpp` plus a `package.json` script over a hand-written `release.sh`; the
   script should call the CLI, not reimplement build/tag/mirror logic.

A non-Node repo (Go, Rust, Python) only needs a private `package.json` with the
`devDependencies` and `dockerImage` fields. If it has no `version`, the CLI
reads the repo's `VERSION` file instead.

Do not add per-repo wrappers that only select a mode — `--mode` is the
standard, and `pnpm exec` finds the CLI from any subdirectory.
