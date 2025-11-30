<script lang="ts">
	/**
	 * LiveEditor - WYSIWYG-like markdown editor
	 *
	 * Renders markdown inline while editing. When cursor is on a line,
	 * it shows the raw markdown. When cursor leaves, it shows rendered version.
	 * Similar to Obsidian/Typora live preview mode.
	 */
	import { onMount, onDestroy, untrack } from 'svelte';
	import { EditorView } from '@codemirror/view';
	import { EditorState } from '@codemirror/state';
	import { createLiveEditorExtensions, liveThemeCompartment, getLiveThemeExtension, liveDecoratorCompartment, getLiveDecoratorExtension } from './live-codemirror-setup';
	import { filesStore } from '$lib/stores/files.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { fileService } from '$lib/services/file-service';
	import { openUrl } from '@tauri-apps/plugin-opener';

	let editorContainer: HTMLDivElement;
	let view: EditorView | null = null;
	let currentBufferId: string | null = null;
	let currentTheme: 'light' | 'dark' | null = null;
	let currentFontSize: number | null = null;
	let errorMessage = $state<string | null>(null);
	let errorTimeout: ReturnType<typeof setTimeout> | null = null;

	function showError(message: string) {
		errorMessage = message;
		if (errorTimeout) clearTimeout(errorTimeout);
		errorTimeout = setTimeout(() => {
			errorMessage = null;
		}, 4000);
	}

	/**
	 * Handle clicks on links in the live editor
	 * Opens external links in browser, internal .md links in editor
	 */
	async function handleLinkClick(e: MouseEvent) {
		const target = e.target as HTMLElement;

		// Check if clicked on a rendered link
		if (!target.classList.contains('cm-rendered-link') && !target.closest('.cm-rendered-link')) {
			return;
		}

		// Need Cmd/Ctrl click to activate links (so normal editing works)
		if (!e.metaKey && !e.ctrlKey) {
			return;
		}

		// Get the line content to extract the URL
		if (!view) return;

		const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
		if (pos === null) return;

		const line = view.state.doc.lineAt(pos);
		const lineText = line.text;

		// Find link at or near cursor position
		const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
		let match;
		let href: string | null = null;

		while ((match = linkRegex.exec(lineText)) !== null) {
			const linkStart = line.from + match.index;
			const linkEnd = linkStart + match[0].length;
			if (pos >= linkStart && pos <= linkEnd) {
				href = match[2];
				break;
			}
		}

		// Also check for plain URLs
		if (!href) {
			const urlRegex = /https?:\/\/[^\s)>\]]+/g;
			while ((match = urlRegex.exec(lineText)) !== null) {
				const urlStart = line.from + match.index;
				const urlEnd = urlStart + match[0].length;
				if (pos >= urlStart && pos <= urlEnd) {
					href = match[0];
					break;
				}
			}
		}

		if (!href) return;

		e.preventDefault();
		e.stopPropagation();

		// Handle anchor links
		if (href.startsWith('#')) {
			return;
		}

		// Handle external links
		if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
			try {
				await openUrl(href);
			} catch (error) {
				console.error('Failed to open URL:', error);
				showError(`Falha ao abrir link: ${error}`);
			}
			return;
		}

		// Handle internal markdown links
		const isMarkdownLink = href.endsWith('.md') || href.endsWith('.markdown');
		if (!isMarkdownLink) return;

		const basePath = filesStore.activeBuffer?.path ?? null;
		const openFolder = filesStore.openFolder;

		if (!basePath && !openFolder) {
			showError('Abra uma pasta para navegar entre arquivos markdown');
			return;
		}

		// Resolve path
		let fullPath: string;
		if (href.startsWith('/')) {
			if (openFolder) {
				fullPath = openFolder + href;
			} else {
				showError('Abra uma pasta para usar links absolutos');
				return;
			}
		} else {
			if (basePath) {
				const baseDir = basePath.substring(0, basePath.lastIndexOf('/'));
				fullPath = baseDir + '/' + href;
			} else if (openFolder) {
				fullPath = openFolder + '/' + href;
			} else {
				showError('Não foi possível resolver o caminho do arquivo');
				return;
			}
		}

		// Normalize path
		fullPath = normalizePath(fullPath);

		const exists = await fileService.fileExists(fullPath);
		if (!exists) {
			showError(`Arquivo não encontrado: ${href}`);
			return;
		}

		await filesStore.openFile(fullPath);
	}

	function normalizePath(path: string): string {
		const parts = path.split('/');
		const normalized: string[] = [];
		for (const part of parts) {
			if (part === '.' || part === '') continue;
			if (part === '..') {
				normalized.pop();
			} else {
				normalized.push(part);
			}
		}
		return '/' + normalized.join('/');
	}

	function handleChange(content: string) {
		const bufferId = untrack(() => filesStore.activeBufferId);
		if (bufferId) {
			filesStore.updateContent(bufferId, content);
		}
	}

	function handleSave() {
		filesStore.saveActiveBuffer();
	}

	function createEditor(content: string, theme: 'light' | 'dark', fontSize: number, basePath: string | null) {
		if (view) {
			view.destroy();
		}

		const state = EditorState.create({
			doc: content,
			extensions: createLiveEditorExtensions(theme === 'dark', handleChange, handleSave, fontSize, basePath)
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

		if (buffer) {
			currentBufferId = buffer.id;
			createEditor(buffer.content, theme, fontSize, buffer.path);
		}

		// Register click handler for links (Cmd/Ctrl+click)
		editorContainer.addEventListener('click', handleLinkClick, true);

		// Listen for formatting commands from EditorToolbar
		function handleFormat(e: CustomEvent<{ format: string; extra?: string }>) {
			if (!view) return;

			const { format, extra } = e.detail;
			const { from, to } = view.state.selection.main;
			const selectedText = view.state.sliceDoc(from, to);
			let replacement = '';
			let cursorOffset = 0;

			switch (format) {
				case 'bold':
					replacement = `**${selectedText || 'texto'}**`;
					cursorOffset = selectedText ? 0 : -2;
					break;
				case 'italic':
					replacement = `*${selectedText || 'texto'}*`;
					cursorOffset = selectedText ? 0 : -1;
					break;
				case 'strikethrough':
					replacement = `~~${selectedText || 'texto'}~~`;
					cursorOffset = selectedText ? 0 : -2;
					break;
				case 'code':
					replacement = `\`${selectedText || 'codigo'}\``;
					cursorOffset = selectedText ? 0 : -1;
					break;
				case 'link':
					replacement = `[${selectedText || 'texto'}](url)`;
					cursorOffset = selectedText ? -1 : -5;
					break;
				case 'image':
					replacement = `![${selectedText || 'alt'}](url)`;
					cursorOffset = selectedText ? -1 : -5;
					break;
				case 'heading': {
					const level = parseInt(extra || '1');
					const hashes = '#'.repeat(level);
					const line = view.state.doc.lineAt(from);
					const lineText = line.text.replace(/^#+\s*/, '');
					view.dispatch({
						changes: { from: line.from, to: line.to, insert: `${hashes} ${lineText}` }
					});
					view.focus();
					return;
				}
				case 'bullet-list': {
					const line = view.state.doc.lineAt(from);
					view.dispatch({
						changes: { from: line.from, insert: '- ' }
					});
					view.focus();
					return;
				}
				case 'numbered-list': {
					const line = view.state.doc.lineAt(from);
					view.dispatch({
						changes: { from: line.from, insert: '1. ' }
					});
					view.focus();
					return;
				}
				case 'blockquote': {
					const line = view.state.doc.lineAt(from);
					view.dispatch({
						changes: { from: line.from, insert: '> ' }
					});
					view.focus();
					return;
				}
				case 'hr':
					replacement = '\n---\n';
					break;
				default:
					return;
			}

			view.dispatch({
				changes: { from, to, insert: replacement },
				selection: { anchor: from + replacement.length + cursorOffset }
			});
			view.focus();
		}

		// Listen for text insertion
		function handleInsertText(e: CustomEvent<{ text: string }>) {
			if (!view) return;

			const { from } = view.state.selection.main;
			view.dispatch({
				changes: { from, to: from, insert: e.detail.text },
				selection: { anchor: from + e.detail.text.length }
			});
			view.focus();
		}

		window.addEventListener('editor-format', handleFormat as EventListener);
		window.addEventListener('editor-insert-text', handleInsertText as EventListener);

		return () => {
			editorContainer.removeEventListener('click', handleLinkClick, true);
			window.removeEventListener('editor-format', handleFormat as EventListener);
			window.removeEventListener('editor-insert-text', handleInsertText as EventListener);
		};
	});

	onDestroy(() => {
		if (view) {
			view.destroy();
		}
		if (errorTimeout) {
			clearTimeout(errorTimeout);
		}
	});

	// Effect for buffer change
	$effect(() => {
		const bufferId = filesStore.activeBufferId;

		if (bufferId && bufferId !== currentBufferId) {
			const buffer = untrack(() => filesStore.buffers.find((b) => b.id === bufferId));
			const theme = untrack(() => settingsStore.theme);
			const fontSize = untrack(() => settingsStore.fontSize);
			if (buffer) {
				currentBufferId = bufferId;
				createEditor(buffer.content, theme, fontSize, buffer.path);
			}
		}
	});

	// Effect for theme/fontSize change
	$effect(() => {
		const theme = settingsStore.theme;
		const fontSize = settingsStore.fontSize;
		const basePath = untrack(() => filesStore.activeBuffer?.path ?? null);

		if (view && (theme !== currentTheme || fontSize !== currentFontSize)) {
			view.dispatch({
				effects: [liveThemeCompartment.reconfigure(getLiveThemeExtension(theme === 'dark', fontSize)), liveDecoratorCompartment.reconfigure(getLiveDecoratorExtension(theme === 'dark', basePath))]
			});
			currentTheme = theme;
			currentFontSize = fontSize;
		}
	});
</script>

<div class="live-editor relative h-full w-full overflow-hidden">
	<div class="h-full w-full" bind:this={editorContainer}></div>

	{#if errorMessage}
		<div class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
			{errorMessage}
		</div>
	{/if}
</div>

<style>
	.live-editor :global(.cm-editor) {
		height: 100%;
		outline: none;
	}

	.live-editor :global(.cm-scroller) {
		overflow: auto;
	}

	.live-editor :global(.cm-focused) {
		outline: none;
	}

	/* Hide markdown syntax - the JS decorator only adds this class to inactive lines */
	.live-editor :global(.cm-md-hidden) {
		display: none;
	}

	/* Rendered elements styling - use !important to override oneDark theme */
	/* Apply to element AND all children to override CodeMirror syntax highlighting */
	.live-editor :global(.cm-rendered-heading-1),
	.live-editor :global(.cm-rendered-heading-1 *) {
		font-size: 2.25em !important;
		font-weight: 800 !important;
		line-height: 1.2 !important;
		color: var(--heading-1-color, #a78bfa) !important;
	}

	.live-editor :global(.cm-rendered-heading-2),
	.live-editor :global(.cm-rendered-heading-2 *) {
		font-size: 1.875em !important;
		font-weight: 700 !important;
		line-height: 1.25 !important;
		color: var(--heading-2-color, #60a5fa) !important;
	}

	.live-editor :global(.cm-rendered-heading-3),
	.live-editor :global(.cm-rendered-heading-3 *) {
		font-size: 1.5em !important;
		font-weight: 700 !important;
		line-height: 1.3 !important;
		color: var(--heading-3-color, #22d3ee) !important;
	}

	.live-editor :global(.cm-rendered-heading-4),
	.live-editor :global(.cm-rendered-heading-4 *) {
		font-size: 1.25em !important;
		font-weight: 600 !important;
		line-height: 1.35 !important;
		color: var(--heading-4-color, #34d399) !important;
	}

	.live-editor :global(.cm-rendered-heading-5),
	.live-editor :global(.cm-rendered-heading-5 *) {
		font-size: 1.125em !important;
		font-weight: 600 !important;
		line-height: 1.4 !important;
		color: var(--heading-5-color, #2dd4bf) !important;
	}

	.live-editor :global(.cm-rendered-heading-6),
	.live-editor :global(.cm-rendered-heading-6 *) {
		font-size: 1em !important;
		font-weight: 600 !important;
		line-height: 1.4 !important;
		color: var(--heading-6-color, #818cf8) !important;
	}

	.live-editor :global(.cm-rendered-bold) {
		font-weight: 700;
	}

	.live-editor :global(.cm-rendered-italic) {
		font-style: italic;
	}

	.live-editor :global(.cm-rendered-code) {
		background: rgba(100, 100, 100, 0.15);
		padding: 2px 6px;
		border-radius: 4px;
		font-family: ui-monospace, monospace;
		font-size: 0.9em;
	}

	.live-editor :global(.cm-rendered-link) {
		color: #06b6d4;
		text-decoration: underline;
		cursor: pointer;
	}

	.live-editor :global(.cm-rendered-strikethrough) {
		text-decoration: line-through;
		opacity: 0.7;
	}

	.live-editor :global(.cm-rendered-blockquote) {
		border-left: 3px solid #06b6d4;
		padding-left: 1em;
		opacity: 0.9;
	}

	.live-editor :global(.cm-rendered-hr) {
		display: block;
		height: 2px;
		background: linear-gradient(to right, #06b6d4, transparent);
		margin: 1em 0;
	}

	.live-editor :global(.cm-rendered-list-marker) {
		color: #06b6d4;
		font-weight: 600;
	}

	.live-editor :global(.cm-rendered-checkbox) {
		color: #06b6d4;
		font-family: ui-monospace, monospace;
	}

	.live-editor :global(.cm-rendered-checkbox-checked) {
		color: #10b981;
	}

	/* Image widget */
	.live-editor :global(.cm-image-widget) {
		display: block;
		padding: 12px 0;
	}

	.live-editor :global(.cm-image-preview) {
		display: block;
		max-width: 100%;
		max-height: 400px;
		border-radius: 8px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.live-editor :global(.cm-image-error) {
		display: block;
		padding: 12px 16px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		color: #ef4444;
		font-size: 0.875em;
	}

	/* Chart widget */
	.live-editor :global(.cm-chart-widget) {
		display: block;
		padding: 12px 0;
		max-width: 400px;
	}

	.live-editor :global(.cm-chart-widget canvas) {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		padding: 8px;
	}

	.live-editor :global(.cm-chart-error) {
		display: block;
		padding: 12px 16px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		color: #ef4444;
		font-size: 0.875em;
	}

	/* Mermaid widget */
	.live-editor :global(.cm-mermaid-widget) {
		display: block;
		padding: 16px 0;
		overflow-x: auto;
	}

	.live-editor :global(.cm-mermaid-widget svg) {
		max-width: 100%;
		height: auto;
	}

	.live-editor :global(.cm-mermaid-error) {
		display: block;
		padding: 12px 16px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		color: #ef4444;
		font-size: 0.875em;
	}
</style>
