import { describe, expect, it } from "vitest"
import { substituteTemplate } from "../src/shared";

describe('SubstituteTempalte', () => {
	const substitution = "labas:?";  // Remove the {{ }} braces
	it(`TEST: {{${substitution}}}`, async () => {
		const result = substituteTemplate({
			template: `cia yra {{${substitution}}}`,  // Braces in the buffer string
			substitutions: {
				[substitution]: "pakeistas tekstas"  // Key without braces, fixed typo
			}
		})
		expect(result).toBe("cia yra pakeistas tekstas")
	});
});
