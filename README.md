# @ponado packages

Internal monorepo for our TypeScript/Node packages. Everything is published to
the private Gitea registry as ESM with subpath exports, so an app installs one
package and imports only the feature it needs.

## Packages

| Package                                             | Subpaths                                                        | Installed dependencies                         |
| --------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| [@ponado/utils](./packages/utils)                   | `date`, `lt`, `shortcuts`, `notifications`, `sse`, `sse/server` | none                                           |
| [@ponado/integrations](./packages/integrations)     | `s3`, `storage`, `email`, `google-calendar`, `stockx`           | only the SDKs for the subpaths you import      |
| [@ponado/documents](./packages/documents)           | `docx`, `pdf`, `xlsx`, `typst`, `shared`, `cli`                 | only the libraries for the subpaths you import |
| [@ponado/docker-image](./packages/docker-image)     | CLI (`ponado-docker-image`)                                     | none                                           |
| [@ponado/lucide-codemod](./packages/lucide-codemod) | CLI (`lucide-codemod`)                                          | none                                           |

Subpaths keep bundles small, and heavy SDKs are **optional peer dependencies**,
so they are only installed when an app actually uses that subpath:

```bash
pnpm add @ponado/documents xlsx-write-stream   # XLSX only: ~280 KB
pnpm add @ponado/documents docxtemplater pizzip docx-merger   # DOCX only: ~4 MB
pnpm add @ponado/documents pdf-lib   # PDF only: ~23 MB
```

## Registry

Add the scope once per consuming project (`.npmrc`):

```ini
@ponado:registry=https://git.ponado.lt/api/packages/ponado/npm/
//git.ponado.lt/api/packages/ponado/npm/:_authToken=${NPM_TOKEN}
```

`NPM_TOKEN` comes from the environment locally and in CI. Tokens are never
committed.

## Usage

```ts
import { calculateAge } from '@ponado/utils/date';
import { createS3Client } from '@ponado/integrations/s3';
import { rowsToXlsxBuffer } from '@ponado/documents/xlsx';
```

Every package is ESM-only (`"type": "module"`, `import` conditions only),
targets Node 20+, and publishes `.d.mts` types next to each entry.

## Migration from the old packages

The previous one-package-per-feature names were removed. Imports map 1:1:

| Old import                       | New import                             | Also install                                                       |
| -------------------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| `@ponado/date-utils`             | `@ponado/utils/date`                   | –                                                                  |
| `@ponado/lt-utils`               | `@ponado/utils/lt`                     | –                                                                  |
| `@ponado/shortcuts`              | `@ponado/utils/shortcuts`              | –                                                                  |
| `@ponado/notifications`          | `@ponado/utils/notifications`          | –                                                                  |
| `@ponado/sse`                    | `@ponado/utils/sse`                    | –                                                                  |
| `@ponado/sse/server`             | `@ponado/utils/sse/server`             | –                                                                  |
| `@ponado/s3`                     | `@ponado/integrations/s3`              | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `file-type` |
| `@ponado/storage`                | `@ponado/integrations/storage`         | –                                                                  |
| `@ponado/email-client`           | `@ponado/integrations/email`           | `@aws-sdk/client-sesv2`, `nodemailer`                              |
| `@ponado/google-calendar-client` | `@ponado/integrations/google-calendar` | `@googleapis/calendar`, `google-auth-library`                      |
| `@ponado/stockx-client`          | `@ponado/integrations/stockx`          | –                                                                  |
| `@ponado/document-utils`         | `@ponado/documents/shared`             | –                                                                  |
| `@ponado/document-utils/server`  | `@ponado/documents/docx`               | `docxtemplater`, `pizzip`, `docx-merger`                           |
| `@ponado/document-utils/server`  | `@ponado/documents/pdf`                | `pdf-lib`                                                          |
| `@ponado/document-utils/server`  | `@ponado/documents/xlsx`               | `xlsx-write-stream`                                                |
| `@ponado/document-utils/server`  | `@ponado/documents/typst`              | –                                                                  |

`executeCliWithFiles` / `isInPath` moved to `@ponado/documents/cli`.

## Development

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

```bash
pnpm changeset          # describe the change; selects affected packages
pnpm version            # bump versions + changelogs
pnpm release            # check, build, publish changed packages
```

Only changed packages are published. Versions are committed as tags by
Changesets, replacing the old hand-run `bumpp` scripts.

## License

MIT
