export const KeyCode = {
	// Letters
	A: 'KeyA',
	B: 'KeyB',
	C: 'KeyC',
	D: 'KeyD',
	E: 'KeyE',
	F: 'KeyF',
	G: 'KeyG',
	H: 'KeyH',
	I: 'KeyI',
	J: 'KeyJ',
	K: 'KeyK',
	L: 'KeyL',
	M: 'KeyM',
	N: 'KeyN',
	O: 'KeyO',
	P: 'KeyP',
	Q: 'KeyQ',
	R: 'KeyR',
	S: 'KeyS',
	T: 'KeyT',
	U: 'KeyU',
	V: 'KeyV',
	W: 'KeyW',
	X: 'KeyX',
	Y: 'KeyY',
	Z: 'KeyZ',

	// Digits (top row)
	Digit0: 'Digit0',
	Digit1: 'Digit1',
	Digit2: 'Digit2',
	Digit3: 'Digit3',
	Digit4: 'Digit4',
	Digit5: 'Digit5',
	Digit6: 'Digit6',
	Digit7: 'Digit7',
	Digit8: 'Digit8',
	Digit9: 'Digit9',

	// Function keys
	F1: 'F1',
	F2: 'F2',
	F3: 'F3',
	F4: 'F4',
	F5: 'F5',
	F6: 'F6',
	F7: 'F7',
	F8: 'F8',
	F9: 'F9',
	F10: 'F10',
	F11: 'F11',
	F12: 'F12',

	// Punctuation / symbols
	Period: 'Period', // .
	Comma: 'Comma', // ,
	Slash: 'Slash', // /
	Backslash: 'Backslash', // \
	Semicolon: 'Semicolon', // ;
	Quote: 'Quote', // '
	BracketLeft: 'BracketLeft', // [
	BracketRight: 'BracketRight', // ]
	Minus: 'Minus', // -
	Equal: 'Equal', // =
	Backquote: 'Backquote', // `

	// Whitespace / editing
	Space: 'Space',
	Enter: 'Enter',
	Tab: 'Tab',
	Backspace: 'Backspace',
	Delete: 'Delete',
	Escape: 'Escape',

	// Navigation
	ArrowUp: 'ArrowUp',
	ArrowDown: 'ArrowDown',
	ArrowLeft: 'ArrowLeft',
	ArrowRight: 'ArrowRight',
	Home: 'Home',
	End: 'End',
	PageUp: 'PageUp',
	PageDown: 'PageDown',

	// Modifiers (rarely bound to directly, but included for completeness)
	ShiftLeft: 'ShiftLeft',
	ShiftRight: 'ShiftRight',
	ControlLeft: 'ControlLeft',
	ControlRight: 'ControlRight',
	AltLeft: 'AltLeft',
	AltRight: 'AltRight',
	MetaLeft: 'MetaLeft',
	MetaRight: 'MetaRight'
} as const satisfies Record<string, string>;

const LETTER_DIGIT_LABELS: Partial<Record<KeyCode, string>> = Object.fromEntries(
	Object.entries(KeyCode)
		.filter(([, code]) => /^(Key|Digit)/.test(code))
		.map(([, code]) => [code, code.replace(/^(Key|Digit)/, '')])
);

// Everything else needs an explicit symbol/label
export const KEY_LABELS: Partial<Record<KeyCode, string>> = {
	...LETTER_DIGIT_LABELS,

	// Punctuation
	[KeyCode.Period]: '.',
	[KeyCode.Comma]: ',',
	[KeyCode.Slash]: '/',
	[KeyCode.Backslash]: '\\',
	[KeyCode.Semicolon]: ';',
	[KeyCode.Quote]: "'",
	[KeyCode.BracketLeft]: '[',
	[KeyCode.BracketRight]: ']',
	[KeyCode.Minus]: '-',
	[KeyCode.Equal]: '=',
	[KeyCode.Backquote]: '`',

	// Whitespace / editing
	[KeyCode.Space]: 'Space',
	[KeyCode.Enter]: '↵',
	[KeyCode.Tab]: '⇥',
	[KeyCode.Backspace]: '⌫',
	[KeyCode.Delete]: 'Del',
	[KeyCode.Escape]: 'Esc',

	// Navigation
	[KeyCode.ArrowUp]: '↑',
	[KeyCode.ArrowDown]: '↓',
	[KeyCode.ArrowLeft]: '←',
	[KeyCode.ArrowRight]: '→',
	[KeyCode.Home]: 'Home',
	[KeyCode.End]: 'End',
	[KeyCode.PageUp]: 'PgUp',
	[KeyCode.PageDown]: 'PgDn',

	// Function keys (F1–F12 already match code names, so these are only
	// here for completeness/discoverability — you could omit and fall
	// back to the raw code like 'F5' since that already reads fine)
	[KeyCode.F1]: 'F1',
	[KeyCode.F2]: 'F2',
	[KeyCode.F3]: 'F3',
	[KeyCode.F4]: 'F4',
	[KeyCode.F5]: 'F5',
	[KeyCode.F6]: 'F6',
	[KeyCode.F7]: 'F7',
	[KeyCode.F8]: 'F8',
	[KeyCode.F9]: 'F9',
	[KeyCode.F10]: 'F10',
	[KeyCode.F11]: 'F11',
	[KeyCode.F12]: 'F12'
};

export type KeyCode = (typeof KeyCode)[keyof typeof KeyCode];

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

const CTRL_LABEL = IS_MAC ? '⌃' : 'Ctrl';
const ALT_LABEL = IS_MAC ? '⌥' : 'Alt';
const SHIFT_LABEL = IS_MAC ? '⇧' : 'Shift';
const MOD_LABEL = IS_MAC ? '⌘' : 'Ctrl';
const META_LABEL = IS_MAC ? '⌘' : 'Win';

export type Shortcut = {
	ctrl?: boolean;
	meta?: boolean;
	alt?: boolean;
	shift?: boolean;
	mod?: boolean;
	code: KeyCode;
};

export function normalize(event: KeyboardEvent): Shortcut {
	return {
		ctrl: event.ctrlKey,
		meta: event.metaKey,
		alt: event.altKey,
		shift: event.shiftKey,
		mod: IS_MAC ? event.metaKey : event.ctrlKey,
		code: event.code as KeyCode
	};
}

export function matches(a: Shortcut, b: Shortcut): boolean {
	if (a.code !== b.code) return false;

	const bMod = !!b.mod;
	const wantsCtrl = !!b.ctrl || (bMod && !IS_MAC);
	const wantsMeta = !!b.meta || (bMod && IS_MAC);

	if (wantsCtrl !== !!a.ctrl) return false;
	if (wantsMeta !== !!a.meta) return false;
	if (!!b.alt !== !!a.alt) return false;
	if (!!b.shift !== !!a.shift) return false;

	return true;
}

export type ShortcutConfig = {
	code: KeyCode;
	ctrl?: boolean;
	meta?: boolean;
	alt?: boolean;
	shift?: boolean;
	mod?: boolean;
	ignoreTypingTarget?: boolean;
	handler: () => void;
};

function isTypingTarget(element: Element | null): boolean {
	return (
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement ||
		element instanceof HTMLSelectElement ||
		element?.hasAttribute('contenteditable') === true
	);
}

export function handleShortcuts(event: KeyboardEvent, shortcuts: ShortcutConfig[] | ShortcutMap) {
	const isTarget = isTypingTarget(document.activeElement);
	const input = normalize(event);
	const list = Array.isArray(shortcuts) ? shortcuts : Object.values(shortcuts);

	for (const sc of list) {
		if (!sc) continue;
		const { handler, ...rest } = sc;
		if (!matches(input, { ...rest, code: rest.code as KeyCode })) continue;
		if (isTarget && !sc.ignoreTypingTarget) continue;
		event.preventDefault();
		handler();
		return;
	}
}

export type ShortcutMap = Record<string, ShortcutConfig | undefined>;

export function shortcutLabel(config: Shortcut): string {
	const parts: string[] = [];
	if (config.mod) {
		parts.push(MOD_LABEL);
	} else {
		if (config.ctrl) parts.push(CTRL_LABEL);
		if (config.meta) parts.push(META_LABEL);
	}
	if (config.alt) parts.push(ALT_LABEL);
	if (config.shift) parts.push(SHIFT_LABEL);
	parts.push(KEY_LABELS[config.code] ?? config.code);
	return parts.join(' + ');
}
