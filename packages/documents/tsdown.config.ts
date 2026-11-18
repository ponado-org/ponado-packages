import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: {
		cli: 'src/cli/index.ts',
		docx: 'src/docx/index.ts',
		pdf: 'src/pdf/index.ts',
		shared: 'src/shared/index.ts',
		typst: 'src/typst/index.ts',
		xlsx: 'src/xlsx/index.ts'
	},
	format: 'esm',
	dts: true,
	deps: {
		neverBundle: ['docx-merger', 'docxtemplater', 'pdf-lib', 'pizzip', 'xlsx-write-stream']
	}
});
