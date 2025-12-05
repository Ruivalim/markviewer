<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { EditorView } from '@codemirror/view';
	import { EditorState } from '@codemirror/state';
	import { createEditorExtensions, themeCompartment, getThemeExtension, spellCheckCompartment, getSpellCheckExtension } from './codemirror-setup';
	import { filesStore } from '$lib/stores/files.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { invoke } from '@tauri-apps/api/core';

	let editorContainer: HTMLDivElement;
	let view: EditorView | null = null;
	let currentBufferId: string | null = null;
	let currentTheme: 'light' | 'dark' | null = null;
	let currentFontSize: number | null = null;
	let currentSpellCheck: boolean | null = null;

	function handleChange(content: string) {
		const bufferId = untrack(() => filesStore.activeBufferId);
		if (bufferId) {
			filesStore.updateContent(bufferId, content);
		}
	}

	function handleSave() {
		filesStore.saveActiveBuffer();
	}

	/**
	 * Handle paste event - check for images in clipboard
	 */
	async function handlePaste(e: ClipboardEvent) {
		if (!e.clipboardData) return;

		// Check for image files in clipboard
		const items = Array.from(e.clipboardData.items);
		const imageItem = items.find((item) => item.type.startsWith('image/'));

		if (!imageItem) return;

		// Get the active buffer's path for saving relative to it
		const basePath = untrack(() => filesStore.activeBuffer?.path);
		if (!basePath) {
			console.warn('Cannot paste image: no file is currently saved');
			return;
		}

		e.preventDefault();

		try {
			// Get the image as a blob
			const blob = imageItem.getAsFile();
			if (!blob) return;

			// Convert to base64
			const reader = new FileReader();
			const base64Promise = new Promise<string>((resolve, reject) => {
				reader.onload = () => resolve(reader.result as string);
				reader.onerror = reject;
			});
			reader.readAsDataURL(blob);
			const base64Data = await base64Promise;

			// Save the image via Rust command
			const relativePath = await invoke<string>('save_pasted_image', {
				base64Data,
				basePath
			});

			// Insert markdown image syntax at cursor
			if (view) {
				const { from } = view.state.selection.main;
				const imageMarkdown = `![pasted image](${relativePath})`;
				view.dispatch({
					changes: { from, to: from, insert: imageMarkdown },
					selection: { anchor: from + imageMarkdown.length }
				});
				view.focus();
			}
		} catch (error) {
			console.error('Failed to paste image:', error);
		}
	}

	function createEditor(content: string, theme: 'light' | 'dark', fontSize: number, spellCheck: boolean, spellCheckLang: string) {
		if (view) {
			view.destroy();
		}

		const state = EditorState.create({
			doc: content,
			extensions: createEditorExtensions(theme === 'dark', handleChange, handleSave, fontSize, spellCheck, spellCheckLang)
		});

		view = new EditorView({
			state,
			parent: editorContainer
		});

		currentTheme = theme;
		currentFontSize = fontSize;
		currentSpellCheck = spellCheck;
	}

	onMount(() => {
		const buffer = filesStore.activeBuffer;
		const theme = settingsStore.theme;
		const fontSize = settingsStore.fontSize;
		const spellCheck = settingsStore.spellCheck;
		const spellCheckLang = settingsStore.spellCheckLanguage;
		if (buffer) {
			currentBufferId = buffer.id;
			createEditor(buffer.content, theme, fontSize, spellCheck, spellCheckLang);
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
				// Small delay to let layout settle
				requestAnimationFrame(() => {
					view?.requestMeasure();
				});
			}
		}
		window.addEventListener('resize', handleWindowResize);

		// Listen for outline navigation
		function handleOutlineNavigate(e: CustomEvent<{ line: number }>) {
			if (view) {
				const line = view.state.doc.line(Math.min(e.detail.line, view.state.doc.lines));
				view.dispatch({
					selection: { anchor: line.from },
					scrollIntoView: true
				});
				view.focus();
			}
		}

		// Listen for formatting commands
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

		// Listen for text insertion (e.g., from drag-drop images)
		function handleInsertText(e: CustomEvent<{ text: string }>) {
			if (!view) return;

			const { from } = view.state.selection.main;
			view.dispatch({
				changes: { from, to: from, insert: e.detail.text },
				selection: { anchor: from + e.detail.text.length }
			});
			view.focus();
		}

		window.addEventListener('outline-navigate', handleOutlineNavigate as EventListener);
		window.addEventListener('editor-format', handleFormat as EventListener);
		window.addEventListener('editor-insert-text', handleInsertText as EventListener);
		editorContainer.addEventListener('paste', handlePaste as unknown as EventListener);

		return () => {
			window.removeEventListener('outline-navigate', handleOutlineNavigate as EventListener);
			window.removeEventListener('editor-format', handleFormat as EventListener);
			window.removeEventListener('editor-insert-text', handleInsertText as EventListener);
			window.removeEventListener('resize', handleWindowResize);
			editorContainer.removeEventListener('paste', handlePaste as unknown as EventListener);
			resizeObserver.disconnect();
		};
	});

	onDestroy(() => {
		if (view) {
			view.destroy();
		}
	});

	// Effect para mudança de buffer (trocar de arquivo)
	$effect(() => {
		const bufferId = filesStore.activeBufferId;

		if (bufferId && bufferId !== currentBufferId) {
			const buffer = untrack(() => filesStore.buffers.find((b) => b.id === bufferId));
			const theme = untrack(() => settingsStore.theme);
			const fontSize = untrack(() => settingsStore.fontSize);
			const spellCheck = untrack(() => settingsStore.spellCheck);
			const spellCheckLang = untrack(() => settingsStore.spellCheckLanguage);
			if (buffer) {
				currentBufferId = bufferId;
				createEditor(buffer.content, theme, fontSize, spellCheck, spellCheckLang);
			}
		}
	});

	// Effect separado para mudança de tema ou fontSize
	// Usa Compartment para atualizar sem recriar o editor (preserva undo/redo)
	$effect(() => {
		const theme = settingsStore.theme;
		const fontSize = settingsStore.fontSize;

		if (view && (theme !== currentTheme || fontSize !== currentFontSize)) {
			// Use compartment to reconfigure theme dynamically
			view.dispatch({
				effects: themeCompartment.reconfigure(getThemeExtension(theme === 'dark', fontSize))
			});
			currentTheme = theme;
			currentFontSize = fontSize;
		}
	});

	// Effect for spell check toggle and language change
	$effect(() => {
		const spellCheck = settingsStore.spellCheck;
		const spellCheckLang = settingsStore.spellCheckLanguage;

		if (view) {
			view.dispatch({
				effects: spellCheckCompartment.reconfigure(getSpellCheckExtension(spellCheck, spellCheckLang))
			});
			currentSpellCheck = spellCheck;
		}
	});
</script>

<div class="editor-wrapper h-full w-full overflow-hidden" bind:this={editorContainer}></div>

<style>
	.editor-wrapper :global(.cm-editor) {
		height: 100%;
		outline: none;
	}

	.editor-wrapper :global(.cm-scroller) {
		overflow: auto;
	}

	.editor-wrapper :global(.cm-focused) {
		outline: none;
	}
</style>
