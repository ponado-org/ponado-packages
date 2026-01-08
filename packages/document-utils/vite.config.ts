import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
	resolve: {
		alias: {
			'@src': path.resolve(__dirname, 'src'),
			'@tests': path.resolve(__dirname, 'tests')
		}
	},
	test: {
		globals: true,
		environment: 'node',
		silent: false,
		root: './tests/'
	}
});
