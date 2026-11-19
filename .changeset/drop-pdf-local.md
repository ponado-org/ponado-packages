---
'@ponado-org/documents': minor
---

Remove `/pdf-local` and the pdf-lib dependency. PDF merging is Gotenberg-only;
the local engine was unused and kept 23 MB in the development install.
