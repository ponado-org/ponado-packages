import { declineName, Linksnis, LinksnisBadges } from "@ponado/lt-utils";
import { CaseStyle, CaseStyles, TemplateFieldDTO, TemplateFieldValidationDTO } from "@ponado/shared/types"
import { capitalizeName } from "@ponado/shared/utils";
import { createPlaceholderRegex } from "../shared/utils.js";

const LinksniaiSet = new Set(Object.keys(LinksnisBadges));
// type LinksniaiKeys = keyof typeof LinksnisBadges;
// type ModifierType = CaseStyle | LinksniaiKeys | "?"

export function parseTemplateFields({
	fields,
	config = {
		firstNameField: "vardas",
		lastNameField: "pavarde",
		validModifiers: [...CaseStyles, ...LinksniaiSet, "?"]
	}
}: {
	fields: Iterable<string>,
	config?: {
		firstNameField: string,
		lastNameField: string,
		validModifiers: string[]
	}
}): TemplateFieldValidationDTO[] {

	const fieldList = Array.from(fields);

	return fieldList.map((rawValue) => {

		const [variable, ...fieldModifiersRaw] = rawValue.toLowerCase().split(":");
		const fieldModifiers = new Set(fieldModifiersRaw);

		if (!variable) throw new Error(`Invalid field: ${rawValue}`);

		const isFirstName = variable.toLowerCase() === config.firstNameField;
		const isLastName = variable.toLowerCase() === config.lastNameField;

		// Determine case style
		let caseStyle: CaseStyle | null = null;
		if (rawValue.toUpperCase() === rawValue) caseStyle = "upper";

		let linksnis: Linksnis | undefined
		let isOptional = false;
		let isValid = true;

		for (const mod of fieldModifiers.values()) {
			if (!linksnis && LinksniaiSet.has(mod)) linksnis = mod as Linksnis
			else if (mod === "?") isOptional = true
			else if (mod === "upper") caseStyle = "upper"
			else if (mod === "lower") caseStyle = "lower"
			else if (fieldModifiers.size > 0) isValid = config.validModifiers.includes(mod);
		}

		const dto: TemplateFieldValidationDTO = {
			isValid,
			isOptional,
			isFirstName,
			isLastName,
			linksnis,
			variable,
			rawValue,
			caseStyle,
		};

		return dto
	});
}


export const extractTemplateFields = (template: string) => {

	const regex = createPlaceholderRegex({});

	let match;
	const fields = new Set<string>();

	while ((match = regex.exec(template)) !== null) {
		const field = match[1];
		if (field !== undefined) {
			fields.add(field);
		}
	}

	const parsedFields = parseTemplateFields({ fields });
	return parsedFields;
};

export function resolveTemplateVariable({
	field,
	person
}: {
	field: TemplateFieldDTO;
	person: {
		firstName: string;
		lastName: string;
	};
}) {
	const applyLetterCasing = (templateString: string, value: string): string => {
		//if template is uppercase substituted value is transformed to uppercase too
		if (templateString === templateString.toUpperCase()) {
			return value.toUpperCase();
		} else {
			return capitalizeName(value);
		}
	};

	const normalizedVariable = field.variable.toLowerCase();

	if (field.linksnis) {
		person.firstName = declineName(person.firstName, field.linksnis);
		person.lastName = declineName(person.lastName, field.linksnis);
	}

	switch (normalizedVariable) {
		case 'vardas':
			return applyLetterCasing(field.variable, person.firstName ?? '');

		case 'pavarde':
			return applyLetterCasing(field.variable, person.lastName ?? '');

		default:
			return '';
	}
}
