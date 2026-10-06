# @ponado/shortcuts

Keyboard shortcut helpers: key codes, platform-aware normalization/matching, and
human-readable labels. Zero dependencies, framework-agnostic.

## Usage

```ts
import { handleShortcuts, KeyCode, shortcutLabel } from '@ponado/shortcuts';

handleShortcuts(event, [{ code: KeyCode.S, mod: true, handler: () => save() }]);

shortcutLabel({ code: KeyCode.S, mod: true }); // "⌘ + S" on mac, "Ctrl + S" elsewhere
```

Bind shortcuts inside `keydown` handlers; `handleShortcuts` calls
`event.preventDefault()` only when a shortcut matches and skips typing targets
(inputs/textareas/selects/contenteditable) unless `ignoreTypingTarget` is set.
