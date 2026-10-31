import { describe, expect, it } from 'vitest';
import { defaultMode, defaultPush, parseModeAnswer } from '../src/interactive';

describe('interactive helpers', () => {
	it('prefers a configured default mode', () => {
		expect(defaultMode(['prod', 'staging', 'dev'], 'staging')).toBe('staging');
	});

	it('falls back to dev', () => {
		expect(defaultMode(['prod', 'staging', 'dev'])).toBe('dev');
	});

	it('falls back to the first mode when dev is absent', () => {
		expect(defaultMode(['prod', 'staging'])).toBe('prod');
	});

	it('parses a mode by number or name', () => {
		expect(parseModeAnswer('2', ['prod', 'staging'])).toBe('staging');
		expect(parseModeAnswer('prod', ['prod', 'staging'])).toBe('prod');
	});

	it('rejects an unknown mode', () => {
		expect(() => parseModeAnswer('qa', ['prod', 'staging'])).toThrow(/Unknown mode/);
		expect(() => parseModeAnswer('0', ['prod', 'staging'])).toThrow(/Unknown mode/);
	});

	it('defaults push on for non-dev modes', () => {
		expect(defaultPush('prod')).toBe(true);
		expect(defaultPush('staging')).toBe(true);
		expect(defaultPush('dev')).toBe(false);
	});
});
