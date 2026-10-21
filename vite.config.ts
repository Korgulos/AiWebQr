import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ['@napi-rs/canvas'],
		include: ['buffer-equal-constant-time', 'jwa']
	},
	resolve: {
		alias: {
			'@napi-rs/canvas': '@napi-rs/canvas/skip-node.js'
		}
	},
	build: {
		commonjsOptions: {
			include: [/node_modules/],
			transformMixedEsModules: true
		}
	}
});
