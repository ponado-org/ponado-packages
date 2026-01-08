import { describe, expect, it } from "vitest"
import { declineFullName } from "../src/lithuanian-declination"
import type { Linksnis } from "../src/lithuanian-declination"

type TestCase = {
	name: string;
	cases: {
		case: Linksnis;
		expected: string;
	}[];
};

const testCases: TestCase[] = [
	{
		name: "Jonas Jonaitis",
		cases: [
			{ case: "sau", expected: "Jonai Jonaiti" },
			{ case: "kil", expected: "Jono Jonaičio" },
			{ case: "nau", expected: "Jonui Jonaičiui" },
			{ case: "gal", expected: "Joną Jonaitį" },
			{ case: "ina", expected: "Jonu Jonaičiu" },
			{ case: "vie", expected: "Jone Jonaityje" },
		]
	},
	{
		name: "Paulius Norvaišas",
		cases: [
			{ case: "sau", expected: "Pauliau Norvaišai" },
			{ case: "kil", expected: "Pauliaus Norvaišo" },
			{ case: "nau", expected: "Pauliui Norvaišui" },
			{ case: "gal", expected: "Paulių Norvaišą" },
			{ case: "ina", expected: "Pauliu Norvaišu" },
			{ case: "vie", expected: "Pauliuje Norvaiše" },
		]
	},
	{
		name: "Ona Onaitė",
		cases: [
			{ case: "sau", expected: "Ona Onaite" },
			{ case: "kil", expected: "Onos Onaitės" },
			{ case: "nau", expected: "Onai Onaitei" },
			{ case: "gal", expected: "Oną Onaitę" },
			{ case: "ina", expected: "Ona Onaite" },
			{ case: "vie", expected: "Onoje Onaitėje" },
		]
	},
	{
		name: "Ginas Strioga",
		cases: [
			{ case: "sau", expected: "Ginai Strioga" },
			{ case: "kil", expected: "Gino Striogos" },
			{ case: "nau", expected: "Ginui Striogai" },
			{ case: "gal", expected: "Giną Striogą" },
			{ case: "ina", expected: "Ginu Strioga" },
			{ case: "vie", expected: "Gine Striogoje" },
		]
	}
];

const caseNames: Record<Linksnis, string> = {
	sau: "vardininkas",
	kil: "kilmininkas",
	nau: "naudininkas",
	gal: "galininkas",
	ina: "įnagininkas",
	vie: "vietininkas"
};

describe('Lithuanian Name Declension', () => {
	testCases.forEach(({ name, cases }) => {
		describe(name, () => {
			cases.forEach(({ case: grammaticalCase, expected }) => {
				it(`${caseNames[grammaticalCase]} (${grammaticalCase})`, () => {
					const declined = declineFullName(name, grammaticalCase);
					expect(declined).toBe(expected);
				});
			});
		});
	});
});
