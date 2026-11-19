# @ponado-org packages

Internal monorepo for our TypeScript/Node packages. Everything is published to
the GitHub Packages registry as ESM with subpath exports, so an app installs one
package and imports only the feature it needs.

## Packages

| Package                                                 | Subpaths                                                        | Installed dependencies                         |
| ------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| [@ponado-org/utils](./packages/utils)                   | `date`, `lt`, `shortcuts`, `notifications`, `sse`, `sse/server` | none                                           |
| [@ponado-org/integrations](./packages/integrations)     | `s3`, `storage`, `email`, `google-calendar`, `stockx`           | only the SDKs for the subpaths you import      |
| [@ponado-org/documents](./packages/documents)           | `docx`, `pdf`, `pdf-local`, `xlsx`, `typst`, `shared`, `cli`    | only the libraries for the subpaths you import |
| [@ponado-org/docker-image](./packages/docker-image)     | CLI (`ponado-docker-image`)                                     | none                                           |
| [@ponado-org/lucide-codemod](./packages/lucide-codemod) | CLI (`lucide-codemod`)                                          | none                                           |

Subpaths keep bundles small, and heavy SDKs are **optional peer dependencies**,
so they are only installed when an app actually uses that subpath:

```bash
pnpm add @ponado-org/documents xlsx-write-stream   # XLSX only: ~280 KB
pnpm add @ponado-org/documents docxtemplater pizzip docx-merger   # DOCX only: ~4 MB
# /pdf uses a Gotenberg sidecar and installs nothing; /pdf-local needs pdf-lib (~23 MB)
pnpm add @ponado-org/documents pdf-lib   # only for /pdf-local
```

## Registry

Packages are published to **GitHub Packages**, so the scope must match the
GitHub owner (`@ponado-org` → `github.com/ponado-org`). Add this to each consuming
project's `.npmrc`:

```ini
@ponado-org:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

GitHub Packages requires authentication even to install packages, using a
**classic** PAT with `read:packages` (add `write:packages` to publish, and
`repo` if the repository is private). Fine-grained PATs are not supported.
`NODE_AUTH_TOKEN` comes from the environment; tokens are never committed.

Locally:

```bash
npm login --scope=@ponado-org --auth-type=legacy --registry=https://npm.pkg.github.com
```

CI uses the workflow's `GITHUB_TOKEN` (see `.github/workflows/release.yml`),
which needs `packages: write`.

## Usage

```ts
import { calculateAge } from '@ponado-org/utils/date';
import { createS3Client } from '@ponado-org/integrations/s3';
import { rowsToXlsxBuffer } from '@ponado-org/documents/xlsx';
```

Every package is ESM-only (`"type": "module"`, `import` conditions only),
targets Node 20+, and publishes `.d.mts` types next to each entry.

## Migration from the old packages

The previous one-package-per-feature names were removed. Imports map 1:1:

| Old import                       | New import                                 | Also install                                                       |
| -------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| `@ponado/date-utils`             | `@ponado-org/utils/date`                   | –                                                                  |
| `@ponado/lt-utils`               | `@ponado-org/utils/lt`                     | –                                                                  |
| `@ponado/shortcuts`              | `@ponado-org/utils/shortcuts`              | –                                                                  |
| `@ponado/notifications`          | `@ponado-org/utils/notifications`          | –                                                                  |
| `@ponado/sse`                    | `@ponado-org/utils/sse`                    | –                                                                  |
| `@ponado/sse/server`             | `@ponado-org/utils/sse/server`             | –                                                                  |
| `@ponado/s3`                     | `@ponado-org/integrations/s3`              | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `file-type` |
| `@ponado/storage`                | `@ponado-org/integrations/storage`         | –                                                                  |
| `@ponado/email-client`           | `@ponado-org/integrations/email`           | `@aws-sdk/client-sesv2`, `nodemailer`                              |
| `@ponado/google-calendar-client` | `@ponado-org/integrations/google-calendar` | `@googleapis/calendar`, `google-auth-library`                      |
| `@ponado/stockx-client`          | `@ponado-org/integrations/stockx`          | –                                                                  |
| `@ponado/document-utils`         | `@ponado-org/documents/shared`             | –                                                                  |
| `@ponado/document-utils/server`  | `@ponado-org/documents/docx`               | `docxtemplater`, `pizzip`, `docx-merger`                           |
| `@ponado/document-utils/server`  | `@ponado-org/documents/pdf`                | Gotenberg sidecar, or `/pdf-local` + `pdf-lib`                     |
| `@ponado/document-utils/server`  | `@ponado-org/documents/xlsx`               | `xlsx-write-stream`                                                |
| `@ponado/document-utils/server`  | `@ponado-org/documents/typst`              | –                                                                  |

`executeCliWithFiles` / `isInPath` moved to `@ponado-org/documents/cli`.

## Development

Requires **Node 22.11+** and **pnpm 12** (CI uses Node 24; the local
`packageManager` pin is pnpm 12.18.0).

```bash
pnpm install
pnpm check      # format + lint + typecheck + test + build + packaging check
```

Tooling is the Oxc stack: `oxlint` (with stable type-aware rules via
`oxlint-tsgolint`) and `oxfmt`. `oxfmt` is pinned to an exact version while it is
pre-1.0, so formatting cannot change under us between installs. `tsc --noEmit`
still owns typechecking; Oxlint's type-aware mode is complementary.

`pnpm check` ends with `scripts/verify-dist.mjs`, which fails if an `exports`
target is missing or if built code imports a package that isn't declared as a
runtime dependency. That is what prevents "works in the monorepo, broken after
publish" releases.

### Adding a subpath

1. Create `packages/<pkg>/src/<name>/index.ts`.
2. Add the entry to that package's `tsdown.config.ts`.
3. Add the matching `exports` entries (`types` + `import`).
4. If it needs a third-party library, add it to `peerDependencies`,
   `peerDependenciesMeta` (optional), and `devDependencies`.
5. Add `external`/`deps.neverBundle` entries if needed.
6. Run `pnpm check`.

## Releasing

Versioning and publishing use [Changesets](https://github.com/changesets/changesets).
Publishing runs in GitHub Actions (`.github/workflows/release.yml`):

1. Add `.changeset/*.md` with `pnpm changeset` and merge it with your PR.
2. The Release workflow opens a "version packages" PR with bumps and changelogs.
3. Merging that PR publishes only the changed packages to GitHub Packages and
   pushes the corresponding tags.

Local equivalent:

```bash
pnpm changeset          # describe the change; selects affected packages
pnpm version            # bump versions + changelogs
pnpm release            # check, build, publish changed packages
```

Packages are ESM-only and `prepack` builds each tarball, so what is published
is exactly what `pnpm check` verified.

### Repository settings

- Package scope `@ponado-org` requires the GitHub account or organization to be
  `ponado-org`.
- Each package's `repository` field must point at this GitHub repository;
  GitHub uses it to link packages to the repo.
- New packages default to private visibility; adjust in the package settings
  if they should be public.

## License

MIT
