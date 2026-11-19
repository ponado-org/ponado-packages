---
'@ponado-org/documents': minor
---

Add a `GotenbergClient` wrapper to `/pdf` so every Gotenberg call shares the
same base URL, headers, timeout, multipart file/field serialization and
`GotenbergError` failures. `mergePdfs` now delegates to it and keeps its
existing signature.

The subpath now targets Gotenberg 9: the merge route moves to
`/forms/pdf/merge`. Added typed `signPdf` (PKCS#12 or PEM certificate, PAdES and
RFC 3161 timestamps), `timestampPdf` and `pdfInfo` helpers for signed
certificates and cards.
