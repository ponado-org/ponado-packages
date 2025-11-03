import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		alias: {
			//shadcn components
			"$scn/*": "./src/lib/components/ui/*",
			//ponado util components
			"$ponado-ui/*": "./src/lib/components/ponado/*"
		},
		adapter: adapter()
	}
};

export default config;
