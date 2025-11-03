import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		alias: {
			'$scn/*': './src/lib/components/ui/*',
			'$scn-extras/*': './src/lib/components/scn-extras/*',
			'$ponado-ui/*': './src/lib/components/ponado-ui/*'
		},
		adapter: adapter()
	}
};

export default config;
