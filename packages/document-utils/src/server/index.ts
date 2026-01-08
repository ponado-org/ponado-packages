export {
	executeCliWithFiles,
	isInPath
} from "./cli-utils.js"

export {
	mergeDocxBuffers,
	docxToPdf,
	renderDocxTemplate,
	docxToString,
	type DocxtemplaterOptions
} from "./utils-docx.js"

export {
	convertSvgToPdf,
	mergePdfs,
	mergeSvgsIntoPdf,
	splitPdfByPage,

} from "./utils-pdf.js"


export {
	escapeTypstString,
	renderTypstTemplateWithData,
	substituteTypstTemplate,
	convertTypstToPdf,
} from "./utils-typst.js"

export {
	objectsToXlsxBuffer,
	rowsToXlsxBuffer,
} from "./utils-xlsx.js"

export {
	parseTemplateFields as parseTemplateField,
	parseTemplateFields,
	extractTemplateFields,
	resolveTemplateVariable,
} from "./utils-templates.js"
