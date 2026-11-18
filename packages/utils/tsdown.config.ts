import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: {
		date: 'src/date/index.ts',
		lt: 'src/lt/index.ts',
		notifications: 'src/notifications/index.ts',
		shortcuts: 'src/shortcuts/index.ts',
		sse: 'src/sse/index.ts',
		'sse/server': 'src/sse/server.ts'
	},
	format: 'esm',
	dts: true
});
