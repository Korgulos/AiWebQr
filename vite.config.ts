import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ['@napi-rs/canvas']
	},
	resolve: {
		alias: {
			'@napi-rs/canvas': '@napi-rs/canvas/skip-node.js'
		}
	}
});
