---
'@ponado-org/documents': minor
---

Replace `docx-merger` with a same-template body concatenation in
`mergeDocxBuffers`. Documents rendered from one DOCX template are merged by
splicing their `<w:body>` content with a page break, keeping the first
document's styles, numbering, relationships, headers and footers. This is much
faster than a general OOXML merge and keeps the "merge once, convert once"
pipeline. Documents whose shared parts differ now throw instead of producing a
corrupt file. The `docx-merger` dependency is gone.
