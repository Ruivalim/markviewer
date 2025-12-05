<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { EditorView } from '@codemirror/view';
	import { EditorState } from '@codemirror/state';
	import { createCodeViewerExtensions, codeThemeCompartment, getCodeThemeExtension } from './codemirror-code-setup';
	import { ExternalLink } from 'lucide-svelte';
	import { filesStore } from '$lib/stores/files.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import type { CodeLanguage } from '$lib/types';

	interface Props {
		content: string;
		language: CodeLanguage;
		filePath?: string | null;
	}

	let { content, language, filePath = null }: Props = $props();

	let editorContainer: HTMLDivElement | undefined = $state();
	let view: EditorView | null = null;
	let currentTheme: 'light' | 'dark' | null = null;
	let currentFontSize: number | null = null;

	function createEditor(code: string, lang: CodeLanguage, theme: 'light' | 'dark', fontSize: number) {
		if (view) {
			view.destroy();
		}

		if (!editorContainer) return;

		const state = EditorState.create({
			doc: code,
			extensions: createCodeViewerExtensions(lang, theme === 'dark', fontSize)
		});

		view = new EditorView({
			state,
			parent: editorContainer
		});

		currentTheme = theme;
		currentFontSize = fontSize;
	}

	async function openInExternalEditor() {
		if (!filePath) return;

		const { invoke } = await import('@tauri-apps/api/core');
		const editor = settingsStore.externalEditor;

		try {
			let command: string;
			// If there's an open folder, open the folder in the editor with the file
			// Otherwise just open the file
			const openFolder = filesStore.openFolder;
			let args: string[];

			switch (editor) {
				case 'vscode':
					command = 'code';
					// VSCode: open folder with -g flag to also go to the file
					args = openFolder ? [openFolder, '-g', filePath] : [filePath];
					break;
				case 'cursor':
					command = 'cursor';
					// Cursor: similar to VSCode
					args = openFolder ? [openFolder, '-g', filePath] : [filePath];
					break;
				case 'neovide':
					command = 'neovide';
					args = [filePath];
					break;
				case 'terminal':
					// Open terminal with nvim
					command = 'open';
					args = ['-a', 'Terminal', filePath];
					break;
				case 'custom':
					command = settingsStore.customEditorCommand || 'code';
					args = openFolder ? [openFolder, filePath] : [filePath];
					break;
				default:
					command = 'code';
					args = openFolder ? [openFolder, '-g', filePath] : [filePath];
			}

			await invoke('open_in_editor', { command, args });
		} catch (error) {
			console.error('Failed to open in external editor:', error);
			// Fallback: try to use shell open
			try {
				await invoke('open_path', { path: filePath });
			} catch (e) {
				console.error('Fallback also failed:', e);
			}
		}
	}

	onMount(() => {
		const theme = settingsStore.theme;
		const fontSize = settingsStore.fontSize;
		createEditor(content, language, theme, fontSize);
	});

	onDestroy(() => {
		if (view) {
			view.destroy();
		}
	});

	// Effect for theme/fontSize change
	$effect(() => {
		const theme = settingsStore.theme;
		const fontSize = settingsStore.fontSize;

		if (view && (theme !== currentTheme || fontSize !== currentFontSize)) {
			view.dispatch({
				effects: codeThemeCompartment.reconfigure(getCodeThemeExtension(theme === 'dark', fontSize))
			});
			currentTheme = theme;
			currentFontSize = fontSize;
		}
	});

	// Effect for content change
	$effect(() => {
		if (view && content !== view.state.doc.toString()) {
			const theme = settingsStore.theme;
			const fontSize = settingsStore.fontSize;
			createEditor(content, language, theme, fontSize);
		}
	});

	const editorLabel = $derived.by(() => {
		switch (settingsStore.externalEditor) {
			case 'vscode': return 'VSCode';
			case 'cursor': return 'Cursor';
			case 'neovide': return 'Neovide';
			case 'terminal': return 'Terminal';
			case 'custom': return 'Editor';
			default: return 'Editor';
		}
	});
</script>

<div class="code-viewer flex h-full flex-col">
	<!-- Toolbar -->
	<div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/50">
		<div class="flex items-center gap-2">
			<span class="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
				{language.toUpperCase()}
			</span>
			<span class="text-xs text-slate-400">Somente leitura</span>
		</div>
		{#if filePath}
			<button
				onclick={openInExternalEditor}
				class="flex items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cyan-600"
			>
				<ExternalLink size={14} />
				Abrir no {editorLabel}
			</button>
		{/if}
	</div>

	<!-- Editor (read-only) -->
	<div class="flex-1 overflow-hidden" bind:this={editorContainer}></div>
</div>

<style>
	.code-viewer :global(.cm-editor) {
		height: 100%;
		outline: none;
	}

	.code-viewer :global(.cm-scroller) {
		overflow: auto;
	}

	.code-viewer :global(.cm-focused) {
		outline: none;
	}

	/* Read-only cursor style */
	.code-viewer :global(.cm-cursor) {
		display: none;
	}
</style>
