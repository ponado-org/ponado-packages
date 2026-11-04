# @ponado/utils

A monorepo of utility packages for TypeScript/Node.js projects.

## Packages

| Package                                             | Version | Description                                     |
| --------------------------------------------------- | ------- | ----------------------------------------------- |
| [@ponado/docker-image](./packages/docker-image)     | 0.5.0   | Build, tag and mirror Docker images             |
| [@ponado/date-utils](./packages/date-utils)         | 0.0.1   | Date formatting and transformation utilities    |
| [@ponado/document-utils](./packages/document-utils) | 0.0.6   | Document processing utilities (DOCX, PDF, XLSX) |
| [@ponado/lt-utils](./packages/lt-utils)             | 0.0.3   | Lithuanian language utilities                   |
| [@ponado/s3](./packages/s3)                         | 0.0.8   | AWS S3 wrapper with common operations           |
| [@ponado/storage](./packages/storage)               | 0.0.1   | Local filesystem + S3 file storage backends     |
| [@ponado/stockx-client](./packages/stockx-client)   | 0.0.5   | StockX API client wrapper                       |

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check all packages
pnpm typecheck
```

## Development

### Adding a New Package

1. Create a new folder in `packages/my-package`
2. Add a `package.json` with the `@ponado/` prefix
3. Extend the base tsconfig: `"extends": "../../tsconfig.base.json"`
4. Add your source code in `src/index.ts`
5. Run `pnpm install` from root

### Publishing

```bash
# Version and publish all packages
pnpm release

# Or version individually
pnpm --filter @ponado/my-package release
```

## Workspace Structure

```
.
├── packages/           # Published packages
│   ├── date-utils/
│   ├── document-utils/
│   ├── lt-utils/
│   ├── s3/
│   └── stockx-client/
├── _archive/          # Legacy code for reference
├── tsconfig.base.json # Shared TypeScript config
└── pnpm-workspace.yaml # Workspace definition
```

## License

MIT
