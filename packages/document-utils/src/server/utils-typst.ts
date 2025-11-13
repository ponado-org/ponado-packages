import { escapeRegexLiteral, substituteTemplate } from '../shared/index.js';
import { createPlaceholderRegex } from '../shared/utils.js';
import { executeCliWithFiles } from './cli-utils.js';

export function escapeTypstString(str: string): string {
	if (!str) return '';
	return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '').replace(/\n/g, ' ');
}

export async function renderTypstTemplateWithData<T>(params: { data: T; template: string }) {
	const jsonString = JSON.stringify(params.data);
	const utf8Buffer = Buffer.from(jsonString, 'utf-8');
	const byteArrayString = Array.from(utf8Buffer).join(', ');

	const compiledTemplate = substituteTemplate({
		template: params.template,
		substitutions: {
			inputData: byteArrayString
		}
	});

	return convertTypstToPdf(compiledTemplate);
}

/**
 * Renders typst template to pdf buffer
 */
export async function convertTypstToPdf(template: string): Promise<Buffer> {
	const pdfBuffer = await executeCliWithFiles<string, Buffer>('typst', template, {
		inputExt: 'typ',
		outputExt: 'pdf',
		buildArgs: (inputFile, outputFile) => ['compile', inputFile, '--format', 'pdf', outputFile]
	});

	return pdfBuffer;
}

export function substituteTypstTemplate({
	template,
	substitutions,
	escapeRegex = true
}: {
	template: string;
	substitutions: Record<string, string>;
	escapeRegex?: boolean;
}) {
	if (!substitutions || Object.keys(substitutions).length === 0) return template;
	const keys = Object.keys(substitutions);
	const pattern = keys.map((k) => (escapeRegex ? escapeRegexLiteral(k) : k)).join('|');

	// Use string constructor, not template literal
	// Add 'u' flag for Unicode support (Lithuanian characters)
	// const regex = new RegExp(`\\{\\{\\s*(${pattern})\\s*\\}\\}`, 'gu');
	const regex = createPlaceholderRegex({ pattern });

	return template.replace(regex, (_, capturedKey) => {
		const value = substitutions[capturedKey];
		if (value === undefined) return _;
		// Convert \n to Typst line breaks
		const processed = value.replace(/\n/g, ' \\ ');
		return `${processed}`;
	});
}
