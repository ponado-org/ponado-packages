# @ponado/document-utils

Document processing utilities for Node.js - DOCX templates, PDF manipulation, and XLSX generation.

## Installation

```bash
pnpm add @ponado/document-utils
```

## Usage

### Shared Utilities

```typescript
import { escapeRegexLiteral, substituteTemplate, tag } from '@ponado/document-utils';

// Escape special regex characters
const escaped = escapeRegexLiteral('price$[test]'); // "price\\$\\[test\\]"

// Simple template substitution
const result = substituteTemplate('Hello {name}!', { name: 'World' });
// "Hello World!"

// Create tagged template literals
const t = tag({ name: 'John' });
const message = t'Hello {name}!'; // "Hello John!"
```

### Server-side Document Processing

```typescript
import {
	substituteDocxTemplate,
	extractTemplateFields,
	mergeDocxFiles,
	generateXlsx,
	fillPdfForm
} from '@ponado/document-utils/server';

// Fill DOCX template
const filledDocx = await substituteDocxTemplate(templateBuffer, {
	name: 'John',
	date: '2024-01-01'
});

// Extract template fields
const fields = await extractTemplateFields(templateBuffer);
// ['name', 'date', ...]

// Merge multiple DOCX files
const merged = await mergeDocxFiles([docx1, docx2, docx3]);

// Generate XLSX from data
const xlsx = await generateXlsx([
	{ name: 'John', age: 30 },
	{ name: 'Jane', age: 25 }
]);

// Fill PDF form
const filledPdf = await fillPdfForm(pdfBuffer, { field1: 'value1' });
```

## Exports

- `@ponado/document-utils` - Shared utilities (works in browser and Node)
- `@ponado/document-utils/server` - Server-side document processing
- `@ponado/document-utils/shared` - Shared utilities (same as main export)

## Typst rendering

Typst -> PDF rendering is delegated to the shared `ponado-typst` HTTP service
(Gotenberg-style sidecar; see `ponado-typst/` in the ponado repo). Set
`TYPST_URL` in the server environment, e.g. `http://ponado-typst:3100`:

```typescript
import { convertTypstToPdf, renderTypstTemplateWithData } from '@ponado/document-utils/server';

const pdf = await convertTypstToPdf('= Hello\n#set text(size: 12pt)');

const filled = await renderTypstTemplateWithData({
	template: '#let inputData = json(bytes(({{inputData}})))\n#inputData.title',
	data: { title: 'Hello' }
});
```

No typst compiler is bundled in this package - if `TYPST_URL` is missing the
render call throws with a clear message.

## Features

- **DOCX Templates**: Fill Word documents with template variables
- **DOCX Merging**: Combine multiple Word documents
- **PDF Forms**: Fill PDF form fields programmatically
- **XLSX Generation**: Create Excel files from JSON data
- **Template Extraction**: Automatically detect template fields

## Dependencies

- `docxtemplater` - DOCX template processing
- `docx-merger` - DOCX file merging
- `pdf-lib` - PDF manipulation
- `xlsx-write-stream` - XLSX generation
