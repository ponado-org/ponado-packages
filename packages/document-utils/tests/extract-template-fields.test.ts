import { describe, expect, it } from "vitest"
import { extractTemplateFields, docxToString } from "../src/server/index"
import { loadFixture } from "./utils"

describe('extractTemplateFields', () => {
	// Helper function to assert valid result
	const assertValidResult = (result: any, message = "Result should be defined and valid") => {
		expect(result, message).toBeDefined()
		expect(result.isValid, `${message} - isValid should be true`).toBe(true)
	}

	it('should parse basic optional field', () => {
		const [result] = extractTemplateFields("{{labas:?}}")

		assertValidResult(result)
		expect(result.variable).toBe("labas")
		expect(result.isOptional).toBe(true)
	})

	it('should parse optional field from docx file', () => {
		const docx = loadFixture("./optional.docx")
		const text = docxToString(docx)
		const [result] = extractTemplateFields(text)

		assertValidResult(result)
		expect(result.variable).toBe("vardas")
		expect(result.isOptional).toBe(true)
	})

	it('should parse optional field with case style', () => {
		const [result] = extractTemplateFields("{{pavarde:?:upper}}")

		assertValidResult(result)
		expect(result.variable).toBe("pavarde")
		expect(result.caseStyle).toBe("upper")
		expect(result.isOptional).toBe(true)
	})

	it('should parse required field with case style', () => {
		const [result] = extractTemplateFields("{{test:lower}}")

		assertValidResult(result)
		expect(result.variable).toBe("test")
		expect(result.caseStyle).toBe("lower")
		expect(result.isOptional).toBe(false)
	})

	it('should parse field with case style and linksnis', () => {
		const [result] = extractTemplateFields("{{test:lower:kil}}")

		assertValidResult(result)
		expect(result.variable).toBe("test")
		expect(result.caseStyle).toBe("lower")
		expect(result.linksnis).toBe("kil")
		expect(result.isOptional).toBe(false)
	})

	it('pareigos', () => {
		const [result] = extractTemplateFields("{{pareigos}}")

		assertValidResult(result)
		expect(result.variable).toBe("pareigos")
		expect(result.isOptional).toBe(false)
		expect(result.caseStyle).toBeNullable()
	})
})
