# @ponado/documents

Document tooling split by format, so an app that only writes XLSX never installs
`pdf-lib` (23 MB) or the DOCX stack. Every format library is an optional peer
dependency of this package.

| Subpath   | Install alongside                        | Weight  |
| --------- | ---------------------------------------- | ------- |
| `/shared` | –                                        | –       |
| `/typst`  | – (uses the ponado-typst HTTP service)   | –       |
| `/cli`    | –                                        | –       |
| `/xlsx`   | `xlsx-write-stream`                      | ~280 KB |
| `/docx`   | `docxtemplater`, `pizzip`, `docx-merger` | ~4 MB   |
| `/pdf`    | `pdf-lib`                                | ~23 MB  |

```bash
# XLSX only
pnpm add @ponado/documents xlsx-write-stream
```

System binaries are needed only for the conversions that shell out:

- `/pdf` → `inkscape` for `convertSvgToPdf` / `mergeSvgsIntoPdf`
- `/docx` → `libreoffice` for `docxToPdf`
- `/typst` → the `ponado-typst` service (`TYPST_URL`)

## `/shared`

```ts
import { escapeRegexLiteral, substituteTemplate, tag } from '@ponado/documents/shared';

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
} from '@ponado/documents/docx';

const filled = renderDocxTemplate({
	docxTemplate: buffer,
	substitutions: { name: 'Jonas' }
});
const text = docxToString(buffer);
const merged = await mergeDocxBuffers([docx1, docx2]);
const pdf = await docxToPdf(buffer); // requires libreoffice
```

## `/pdf`

```ts
import {
	mergePdfs,
	splitPdfByPage,
	convertSvgToPdf,
	mergeSvgsIntoPdf
} from '@ponado/documents/pdf';

const merged = await mergePdfs([pdf1, pdf2]);
const pages = await splitPdfByPage(pdfBuffer);
const pdf = await convertSvgToPdf(svg, { textToPaths: true }); // requires inkscape
const combined = await mergeSvgsIntoPdf([svg1, svg2]);
```

Inkscape jobs are serialized inside the module, so `mergeSvgsIntoPdf` doesn't
overload the machine and the package needs no queue dependency.

## `/xlsx`

```ts
import { objectsToXlsxBuffer, rowsToXlsxBuffer } from '@ponado/documents/xlsx';

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
} from '@ponado/documents/typst';

const pdf = await convertTypstToPdf(template, { inputs: { name: 'Jonas' } });
```

Rendering is delegated to `TYPST_URL` (default `http://ponado-typst:3100` on the
shared Docker network) so the Typst compiler is never bundled into an app.
