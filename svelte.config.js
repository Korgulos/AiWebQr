import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		env: {
			dir: '.',
			publicPrefix: 'PUBLIC_',
			privatePrefix: ''
		}
	}
};

export default config;
