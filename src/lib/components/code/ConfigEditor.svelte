<script lang="ts">
	/**
	 * ConfigEditor - Editable code editor for config files (JSON, YAML, TOML)
	 * with syntax highlighting
	 */
	import { onMount, onDestroy, untrack } from 'svelte';
	import { EditorView } from '@codemirror/view';
	import { EditorState } from '@codemirror/state';
	import { createConfigEditorExtensions, configThemeCompartment, getConfigThemeExtension } from './codemirror-config-setup';
	import { filesStore } from '$lib/stores/files.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import type { CodeLanguage } from '$lib/types';

	let editorContainer: HTMLDivElement;
	let view: EditorView | null = null;
	let currentBufferId: string | null = null;
	let currentTheme: 'light' | 'dark' | null = null;
	let currentFontSize: number | null = null;

	function handleChange(content: string) {
		const bufferId = untrack(() => filesStore.activeBufferId);
		if (bufferId) {
			filesStore.updateContent(bufferId, content);
		}
	}

	function handleSave() {
		filesStore.saveActiveBuffer();
	}

	function createEditor(content: string, language: CodeLanguage, theme: 'light' | 'dark', fontSize: number) {
		if (view) {
			view.destroy();
		}

		const state = EditorState.create({
			doc: content,
			extensions: createConfigEditorExtensions(language, theme === 'dark', handleChange, handleSave, fontSize)
		});

		view = new EditorView({
			state,
			parent: editorContainer
		});

		currentTheme = theme;
		currentFontSize = fontSize;
	}

	onMount(() => {
		const buffer = filesStore.activeBuffer;
		const theme = settingsStore.theme;
		const fontSize = settingsStore.fontSize;

		if (buffer && buffer.language) {
			currentBufferId = buffer.id;
			createEditor(buffer.content, buffer.language, theme, fontSize);
		}

		// ResizeObserver to handle fullscreen and window resize
		const resizeObserver = new ResizeObserver(() => {
			if (view) {
				view.requestMeasure();
			}
		});
		resizeObserver.observe(editorContainer);

		// Also observe window resize for fullscreen height changes
		function handleWindowResize() {
			if (view) {
				requestAnimationFrame(() => {
					view?.requestMeasure();
				});
			}
		}
		window.addEventListener('resize', handleWindowResize);

		return () => {
			window.removeEventListener('resize', handleWindowResize);
			resizeObserver.disconnect();
		};
	});

	onDestroy(() => {
		if (view) {
			view.destroy();
		}
	});

	// Effect for buffer change
	$effect(() => {
		const bufferId = filesStore.activeBufferId;

		if (bufferId && bufferId !== currentBufferId) {
			const buffer = untrack(() => filesStore.buffers.find((b) => b.id === bufferId));
			const theme = untrack(() => settingsStore.theme);
			const fontSize = untrack(() => settingsStore.fontSize);
			if (buffer && buffer.language) {
				currentBufferId = bufferId;
				createEditor(buffer.content, buffer.language, theme, fontSize);
			}
		}
	});

	// Effect for theme/fontSize change
	$effect(() => {
		const theme = settingsStore.theme;
		const fontSize = settingsStore.fontSize;

		if (view && (theme !== currentTheme || fontSize !== currentFontSize)) {
			view.dispatch({
				effects: configThemeCompartment.reconfigure(getConfigThemeExtension(theme === 'dark', fontSize))
			});
			currentTheme = theme;
			currentFontSize = fontSize;
		}
	});
</script>

<div class="config-editor h-full w-full overflow-hidden">
	<div class="h-full w-full" bind:this={editorContainer}></div>
</div>

<style>
	.config-editor :global(.cm-editor) {
		height: 100%;
		outline: none;
	}

	.config-editor :global(.cm-scroller) {
		overflow: auto;
	}

	.config-editor :global(.cm-focused) {
		outline: none;
	}
</style>
