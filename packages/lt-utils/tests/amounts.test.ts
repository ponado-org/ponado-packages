import { describe, expect, it } from "vitest"
import { getVerbalAmount } from "../src/stringify-amount"

describe('Stringify amount', () => {
	it('amount', async () => {
		const amount = 6969;
		const verbalAmount = getVerbalAmount(amount)
		expect(verbalAmount).toBe("šeši tūkstančiai devyni šimtai šešiasdešimt devyni")
	});
});

describe('Stringify amount 2284325', () => {
	it('amount', async () => {
		const amount = 2284325;
		const verbalAmount = getVerbalAmount(amount)
		expect(verbalAmount).toBe("du milijonai du šimtai aštuoniasdešimt keturi tūkstančiai trys šimtai dvidešimt penki")
	});
});

describe('Stringify amount 22843', () => {
	it('amount', async () => {
		const amount = 22843;
		const verbalAmount = getVerbalAmount(amount)
		expect(verbalAmount).toBe("dvidešimt du tūkstančiai aštuoni šimtai keturiasdešimt trys")
	});
});
