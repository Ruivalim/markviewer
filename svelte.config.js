// Tauri doesn't have a Node.js server to do proper SSR
// so we use adapter-static with a fallback to index.html to put the site in SPA mode
// See: https://svelte.dev/docs/kit/single-page-apps
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: 'index.html'
		})
	},
	compilerOptions: {
		warningFilter: (warning) => {
			const errors = ['a11y_interactive_supports_focus', 'a11y_click_events_have_key_events', 'a11y_label_has_associated_control', 'a11y_no_static_element_interactions'];

			if (errors.includes(warning.code)) return false;

			return true;
		}
	}
};

export default config;
