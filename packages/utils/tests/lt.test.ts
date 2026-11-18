import { expect, test } from 'vitest';
import { getVerbalAmount, isWeekend, normalizeLithuanianLetters } from '../src/lt/index';

test('normalizeLithuanianLetters strips diacritics', () => {
	expect(normalizeLithuanianLetters('ąčęėįšųūž')).toBe('aceeisuuz');
});

test('isWeekend detects saturday and sunday', () => {
	expect(isWeekend(new Date(2025, 11, 6))).toBe(true); // Saturday
	expect(isWeekend(new Date(2025, 11, 8))).toBe(false); // Monday
});

test('getVerbalAmount stringifies numbers in Lithuanian', () => {
	expect(getVerbalAmount(5)).toContain('penki');
});
