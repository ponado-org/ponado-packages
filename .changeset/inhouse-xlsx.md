---
'@ponado-org/documents': minor
---

Replace `xlsx-write-stream` with a dependency-free XLSX writer. The `/xlsx`
subpath now installs nothing and writes native numbers, booleans and dates
(with date formatting), bold headers, sheet names and column widths.

Add CSV and TSV serializers to the same subpath: `objectsToCsv`, `rowsToCsv`,
`objectsToTsv` and `rowsToTsv`. They include formula-injection protection and
an optional UTF-8 BOM for Excel.
