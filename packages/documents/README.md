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
| `/pdf`    | – (uses a Gotenberg 9 sidecar)           | –       |

```bash
# XLSX only
pnpm add @ponado-org/documents xlsx-write-stream
```

System binaries and services are needed only for the operations that use them:

- `/pdf` → a Gotenberg 9 instance (`POST /forms/pdf/merge`)
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

PDF operations run through a **Gotenberg 9** sidecar. `GotenbergClient` is the
single place that owns the request shape, so every Gotenberg route is called the
same way.

```ts
import { GotenbergClient, mergePdfs } from '@ponado-org/documents/pdf';

const gotenberg = new GotenbergClient({
	url: 'http://gotenberg:3000',
	timeoutMs: 60_000, // optional default for every request
	headers: {} // optional headers for every request (auth, …)
});

// Convenience method: files are named 0000.pdf, 0001.pdf, …
const merged = await gotenberg.mergePdfs([pdf1, pdf2]);

// Any Gotenberg route: uploads go in `files`, route parameters in `fields`
const pdf = await gotenberg.request('/forms/libreoffice/convert', {
	files: [{ data: docx, filename: 'report.docx' }],
	fields: { landscape: true, marginTop: '0.5' },
	headers: { 'Gotenberg-Output-Filename': 'report' }
});
```

`fields` skips `null`/`undefined`, stringifies booleans and numbers, and appends
array values as repeated fields. `headers` carries Gotenberg service options
(output filename, trace, webhooks) and auth. Failed requests throw
`GotenbergError` with `route`, `status` and `detail`; use `post` when the raw
`Response` matters (for example webhook requests that return `204`).

### Signing and timestamps

Gotenberg 9 can sign PDFs cryptographically. A signature proves who signed the
file and that its bytes did not change; a stamp, watermark or metadata field
does not. Finish merging, stamping, metadata and optimization **before**
signing — rewriting the file afterwards invalidates the signature.

```ts
const signed = await gotenberg.signPdf(cardPdf, {
	certificate: {
		kind: 'pkcs12',
		data: p12Buffer,
		filename: 'issuer.p12',
		password: process.env.P12_PASSWORD
	},
	pades: true, // eIDAS-recognized signature format
	name: 'Ponado',
	reason: 'Original document',
	location: 'Vilnius',
	timestampUrl: 'http://timestamp.digicert.com'
});
```

PEM certificates work too:

```ts
const signed = await gotenberg.signPdf(cardPdf, {
	certificate: {
		kind: 'pem',
		certificate: { data: certificatePem, filename: 'cert.pem' },
		key: { data: privateKeyPem, filename: 'key.pem' }
	},
	pades: true
});
```

`timestampPdf` adds an RFC 3161 document timestamp without a signer, and
`pdfInfo` reports `signed`, `encrypted` and page details. `pdfInfo.signed` only
means a signature is present: Gotenberg does not validate signatures. Verify
with a PDF reader, `pdfsig`, or `pyHanko`.

Signing needs a certificate recipients trust. A self-signed certificate proves
integrity but viewers mark it untrusted; for third-party trust use a CA-issued
certificate. The signing key is uploaded to Gotenberg, so keep the service on a
private network (TLS and auth) or sign with a separate HSM-backed service for
higher-value certificates. Gotenberg operators must also allow the timestamp
authority host (`--pdf-allow-list`) when using `timestampUrl`.

The standalone `mergePdfs(pdfs, { url, timeoutMs })` remains available and
delegates to the client. It names inputs `0000.pdf`, `0001.pdf`, … because
Gotenberg merges in alphanumeric filename order, not upload order. A single
input is returned as-is without a request.

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
