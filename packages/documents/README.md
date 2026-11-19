# @ponado-org/documents

Document tooling split by format, so an app that only writes XLSX never installs
`pdf-lib` (23 MB) or the DOCX stack. Format libraries are listed under
`subpathDependencies` and must be installed explicitly for the subpaths you use.

| Subpath   | Install alongside                        | Weight  |
| --------- | ---------------------------------------- | ------- |
| `/shared` | –                                        | –       |
| `/typst`  | – (uses the ponado-typst HTTP service)   | –       |
| `/cli`    | –                                        | –       |
| `/xlsx`   | `xlsx-write-stream`                      | ~280 KB |
| `/docx`   | `docxtemplater`, `pizzip`, `docx-merger` | ~4 MB   |
| `/pdf`    | – (uses a Gotenberg sidecar)             | –       |

```bash
# XLSX only
pnpm add @ponado-org/documents xlsx-write-stream
```

System binaries and services are needed only for the operations that use them:

- `/pdf` → a Gotenberg instance (`POST /forms/pdfengines/merge`)
- `/docx` → `libreoffice` for `docxToPdf`
- `/typst` → the `ponado-typst` service (`TYPST_URL`)

## `/shared`

```ts
import { escapeRegexLiteral, substituteTemplate, tag } from '@ponado-org/documents/shared';

escapeRegexLiteral('price$[test]'); // "price\\$\\[test\\]"
substituteTemplate({
	template: 'Hello {{name}}!',
	substitutions: { name: 'World' }
}); // "Hello World!"

// identity tagged template used for editor syntax highlighting
const t = tag('html');
t`<p>Hello</p>`;
```

## `/docx`

```ts
import {
	docxToString,
	renderDocxTemplate,
	mergeDocxBuffers,
	docxToPdf
} from '@ponado-org/documents/docx';

const filled = renderDocxTemplate({
	docxTemplate: buffer,
	substitutions: { name: 'Jonas' }
});
const text = docxToString(buffer);
const merged = await mergeDocxBuffers([docx1, docx2]);
const pdf = await docxToPdf(buffer); // requires libreoffice
```

## `/pdf`

Merges PDFs through a Gotenberg sidecar. No PDF engine is bundled, so this is
the subpath to use in server deployments that already run Gotenberg.

```ts
import { mergePdfs } from '@ponado-org/documents/pdf';

const merged = await mergePdfs([pdf1, pdf2], {
	url: 'http://gotenberg:3000',
	timeoutMs: 60_000 // optional
});
```

Inputs are named `0000.pdf`, `0001.pdf`, … because Gotenberg merges in
alphanumeric filename order, not upload order. A single input is returned
as-is without a request.

## `/xlsx`

```ts
import { objectsToXlsxBuffer, rowsToXlsxBuffer } from '@ponado-org/documents/xlsx';

const fromObjects = await objectsToXlsxBuffer([{ name: 'Jonas', age: 30 }]);
const fromRows = await rowsToXlsxBuffer([['Jonas', 30]]);
```

## `/typst`

```ts
import {
	convertTypstToPdf,
	renderTypstTemplateWithData,
	substituteTypstTemplate,
	escapeTypstString
} from '@ponado-org/documents/typst';

const pdf = await convertTypstToPdf(template, { inputs: { name: 'Jonas' } });
```

Rendering is delegated to `TYPST_URL` (default `http://ponado-typst:3100` on the
shared Docker network) so the Typst compiler is never bundled into an app.
