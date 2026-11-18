# @ponado-org/lucide-codemod

Rewrites `@lucide/svelte` imports to individual icon paths and normalizes local
names to the `…Icon` convention (`ShieldAlert` → `ShieldAlertIcon`), renaming
every usage. Individual paths keep the bundle small — a barrel import pulls in
every icon.

## Usage

```bash
pnpm dlx @ponado-org/lucide-codemod src
pnpm dlx @ponado-org/lucide-codemod src --dry
```

- `[dir]` — directory to walk (default: `src`)
- `--dry`, `-n` — print planned changes without writing

## What it does

```diff
- import { ShieldAlert } from "@lucide/svelte";
+ import ShieldAlertIcon from "@lucide/svelte/icons/shield-alert";

- import Eye from "@lucide/svelte/icons/eye";
+ import EyeIcon from "@lucide/svelte/icons/eye";
```

Every usage in the file is renamed (`<ShieldAlert />`, `renderComponent(Eye, …)`,
`{Eye}`, `${Eye}` …).

Safety:

- string literals and comments are never touched
- in `.svelte` files only tag names and `{…}` expressions are renamed — text
  nodes and attribute strings stay as-is
- `import type { LucideIcon }` and already-suffixed imports are skipped, so the
  codemod is idempotent and safe to re-run
