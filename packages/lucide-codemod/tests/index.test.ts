import { expect, test } from 'vitest';
import { transformFile } from '../src';

test('barrel imports become direct paths with the Icon suffix; usages renamed', () => {
	const code = `<script lang="ts">
	import { ShieldAlert, File } from "@lucide/svelte";

	const label = "File";
</script>

<!-- File comment -->
<p>File</p>
<File />
<ShieldAlert />
`;
	const result = transformFile(code, 'component.svelte');
	expect(result).not.toBeNull();
	expect(result!.next).toContain(
		'import ShieldAlertIcon from "@lucide/svelte/icons/shield-alert";'
	);
	expect(result!.next).toContain('import FileIcon from "@lucide/svelte/icons/file";');
	expect(result!.next).toContain('<FileIcon />');
	expect(result!.next).toContain('<ShieldAlertIcon />');
	expect(result!.next).toContain('const label = "File";');
	expect(result!.next).toContain('<!-- File comment -->');
	expect(result!.next).toContain('<p>File</p>');
});

test('direct import gets the Icon suffix and renames usages', () => {
	const code = `import Eye from "@lucide/svelte/icons/eye";\nconst icon = Eye;\n`;
	const result = transformFile(code, 'util.ts');
	expect(result).not.toBeNull();
	expect(result!.next).toContain('import EyeIcon from "@lucide/svelte/icons/eye";');
	expect(result!.next).toContain('const icon = EyeIcon;');
});

test('aliased barrel specifier keeps the alias and gets the suffix', () => {
	const code = `import { BanknoteIcon as Banknote } from "@lucide/svelte";\nconst x = Banknote;\n`;
	const result = transformFile(code, 'util.ts');
	expect(result).not.toBeNull();
	expect(result!.next).toContain('import BanknoteIcon from "@lucide/svelte/icons/banknote";');
	expect(result!.next).toContain('const x = BanknoteIcon;');
});

test('already suffixed imports are a no-op', () => {
	const code = `import EyeIcon from "@lucide/svelte/icons/eye";\nconst icon = EyeIcon;\n`;
	expect(transformFile(code, 'util.ts')).toBeNull();
});

test('type-only imports are untouched', () => {
	const code = `import type { LucideIcon } from "@lucide/svelte";\nlet icon: LucideIcon;\n`;
	expect(transformFile(code, 'types.ts')).toBeNull();
});
