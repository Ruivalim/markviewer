<script lang="ts">
	import { markdownService, type SpecialBlock } from '$lib/services/markdown-service';
	import { mermaidService } from '$lib/services/mermaid-service';
	import { chartService } from '$lib/services/chart-service';
	import { logParser } from '$lib/services/log-parser';
	import { fileService } from '$lib/services/file-service';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { filesStore } from '$lib/stores/files.svelte';
	import { stylesStore } from '$lib/stores/styles.svelte';
	import { onDestroy, tick } from 'svelte';
	import { convertFileSrc } from '@tauri-apps/api/core';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { invoke } from '@tauri-apps/api/core';
	import type { FileType } from '$lib/types';

	interface Props {
		content: string;
		fileType?: FileType;
	}

	let { content, fileType = 'markdown' }: Props = $props();

	// State for rendered content
	let html = $state('');
	let specialBlocks = $state<SpecialBlock[]>([]);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let previewContainer: HTMLDivElement;
	let errorMessage = $state<string | null>(null);
	let errorTimeout: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Convert __LOCAL_FILE__:/path markers to asset:// URLs for Tauri webview
	 */
	function convertLocalFilePaths(htmlContent: string): string {
		return htmlContent.replace(/__LOCAL_FILE__:([^"'>\s]+)/g, (_, filePath) => {
			return convertFileSrc(filePath);
		});
	}

	// Initialize mermaid with current theme
	$effect(() => {
		mermaidService.init(settingsStore.theme);
	});

	// Re-render diagrams on theme change
	$effect(() => {
		const theme = settingsStore.theme;
		mermaidService.updateTheme(theme);

		// Re-render all special blocks with new theme
		if (specialBlocks.length > 0) {
			renderSpecialBlocks(theme);
		}
	});

	// Main render effect
	$effect(() => {
		const currentContent = content;
		const theme = settingsStore.theme;
		const basePath = filesStore.activeBuffer?.path ?? null;
		const currentFileType = fileType;

		if (debounceTimer) clearTimeout(debounceTimer);

		debounceTimer = setTimeout(async () => {
			try {
				if (currentFileType === 'log') {
					// For log files, use the structured log renderer
					html = logParser.parseAndRender(currentContent);
					specialBlocks = [];
				} else if (currentFileType === 'text') {
					// For text files, render as syntax-highlighted code block
					const highlighted = await invoke<string>('highlight_code_block', {
						code: currentContent,
						lang: 'txt'
					});
					html = `<pre class="text-file-preview"><code>${highlighted}</code></pre>`;
					specialBlocks = [];
				} else {
					// For markdown files, use the full markdown renderer
					const result = await markdownService.render(currentContent, basePath, theme);
					// Convert local file paths to asset:// protocol
					html = convertLocalFilePaths(result.html);
					specialBlocks = result.special_blocks;

					// Wait for DOM update, then render special blocks
					await tick();
					await renderSpecialBlocks(theme);
				}
			} catch (error) {
				console.error('Preview render error:', error);
				html = `<pre>${escapeHtml(currentContent)}</pre>`;
				specialBlocks = [];
			}
		}, 150);
	});

	/**
	 * Render special blocks (mermaid diagrams and charts)
	 */
	async function renderSpecialBlocks(theme: 'light' | 'dark') {
		for (const block of specialBlocks) {
			const container = document.getElementById(block.placeholder_id);
			if (!container) continue;

			if (block.block_type === 'mermaid') {
				try {
					const svg = await mermaidService.render(block.placeholder_id, block.content);
					container.innerHTML = svg;
				} catch (error) {
					console.error('Mermaid render error:', error);
					container.innerHTML = `<div class="diagram-error">Failed to render diagram</div>`;
				}
			} else if (block.block_type === 'chart') {
				chartService.render(block.placeholder_id, block.content, theme);
			}
		}
	}

	/**
	 * Escape HTML for error display
	 */
	function escapeHtml(text: string): string {
		return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	/**
	 * Show error message temporarily
	 */
	function showError(message: string) {
		errorMessage = message;
		if (errorTimeout) clearTimeout(errorTimeout);
		errorTimeout = setTimeout(() => {
			errorMessage = null;
		}, 4000);
	}

	/**
	 * Handle clicks on links in the preview
	 * Intercepts relative markdown links and opens them in the editor
	 * Opens external links in the default browser
	 */
	async function handleLinkClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		const link = target.closest('a');

		if (!link) return;

		const href = link.getAttribute('href');
		if (!href) return;

		// Skip anchor links (same page)
		if (href.startsWith('#')) {
			return;
		}

		// Open external links in browser
		if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
			e.preventDefault();
			e.stopPropagation();
			try {
				console.log('Opening URL:', href);
				await openUrl(href);
			} catch (error) {
				console.error('Failed to open URL:', error);
				showError(`Falha ao abrir link: ${error}`);
			}
			return;
		}

		// Check if it's a markdown file link
		const isMarkdownLink = href.endsWith('.md') || href.endsWith('.markdown');
		if (!isMarkdownLink) return;

		// Prevent default navigation
		e.preventDefault();
		e.stopPropagation();

		// We need either an open folder or an active file with a path to resolve relative links
		const basePath = filesStore.activeBuffer?.path ?? null;
		const openFolder = filesStore.openFolder;

		if (!basePath && !openFolder) {
			showError('Abra uma pasta para navegar entre arquivos markdown');
			return;
		}

		// Resolve the full path
		let fullPath: string;

		if (href.startsWith('/')) {
			// Absolute path from folder root
			if (openFolder) {
				fullPath = openFolder + href;
			} else {
				showError('Abra uma pasta para usar links absolutos');
				return;
			}
		} else {
			// Relative path from current file
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

		// Normalize path (remove ./ and resolve ../)
		fullPath = normalizePath(fullPath);

		// Check if file exists
		const exists = await fileService.fileExists(fullPath);

		if (!exists) {
			showError(`Arquivo não encontrado: ${href}`);
			return;
		}

		// Open the file
		await filesStore.openFile(fullPath);
	}

	/**
	 * Normalize file path (resolve ./ and ../)
	 */
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

	// Register click handler with capturing to intercept links before navigation
	$effect(() => {
		if (previewContainer) {
			previewContainer.addEventListener('click', handleLinkClick, true);
			return () => {
				previewContainer.removeEventListener('click', handleLinkClick, true);
			};
		}
	});

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		if (errorTimeout) clearTimeout(errorTimeout);
		chartService.destroyAll();
	});

	// Generate dynamic CSS variables from style config
	const dynamicStyles = $derived.by(() => {
		const isDark = settingsStore.theme === 'dark';
		const styles = stylesStore.config;

		return `
			--h1-color: ${isDark ? styles.headings.h1.colorDark : styles.headings.h1.colorLight};
			--h1-size: ${styles.headings.h1.fontSize};
			--h1-weight: ${styles.headings.h1.fontWeight};
			--h1-line-height: ${styles.headings.h1.lineHeight};

			--h2-color: ${isDark ? styles.headings.h2.colorDark : styles.headings.h2.colorLight};
			--h2-size: ${styles.headings.h2.fontSize};
			--h2-weight: ${styles.headings.h2.fontWeight};
			--h2-line-height: ${styles.headings.h2.lineHeight};

			--h3-color: ${isDark ? styles.headings.h3.colorDark : styles.headings.h3.colorLight};
			--h3-size: ${styles.headings.h3.fontSize};
			--h3-weight: ${styles.headings.h3.fontWeight};
			--h3-line-height: ${styles.headings.h3.lineHeight};

			--h4-color: ${isDark ? styles.headings.h4.colorDark : styles.headings.h4.colorLight};
			--h4-size: ${styles.headings.h4.fontSize};
			--h4-weight: ${styles.headings.h4.fontWeight};
			--h4-line-height: ${styles.headings.h4.lineHeight};

			--h5-color: ${isDark ? styles.headings.h5.colorDark : styles.headings.h5.colorLight};
			--h5-size: ${styles.headings.h5.fontSize};
			--h5-weight: ${styles.headings.h5.fontWeight};
			--h5-line-height: ${styles.headings.h5.lineHeight};

			--h6-color: ${isDark ? styles.headings.h6.colorDark : styles.headings.h6.colorLight};
			--h6-size: ${styles.headings.h6.fontSize};
			--h6-weight: ${styles.headings.h6.fontWeight};
			--h6-line-height: ${styles.headings.h6.lineHeight};

			--link-color: ${isDark ? styles.link.colorDark : styles.link.colorLight};
			--link-decoration: ${styles.link.underline ? 'underline' : 'none'};

			--code-bg: ${isDark ? styles.inlineCode.backgroundDark : styles.inlineCode.backgroundLight};
			--code-color: ${isDark ? styles.inlineCode.colorDark : styles.inlineCode.colorLight};
			--code-font: ${styles.inlineCode.fontFamily};

			--blockquote-border: ${isDark ? styles.blockquote.borderColorDark : styles.blockquote.borderColorLight};
			--blockquote-border-width: ${styles.blockquote.borderWidth}px;

			--list-color: ${isDark ? styles.list.colorDark : styles.list.colorLight};
			--list-bullet: "${styles.list.bulletChar}";

			--code-block-bg: ${isDark ? styles.codeBlock.backgroundDark : styles.codeBlock.backgroundLight};
		`;
	});
</script>

<div bind:this={previewContainer} class="preview relative h-full overflow-auto bg-white p-6 dark:bg-slate-900" style={dynamicStyles}>
	<article class="prose prose-slate dark:prose-invert mx-auto max-w-3xl">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html html}
	</article>

	{#if errorMessage}
		<div class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
			{errorMessage}
		</div>
	{/if}
</div>

<style>
	.preview :global(.prose) {
		--tw-prose-body: #334155;
		--tw-prose-headings: #0f172a;
		--tw-prose-lead: #475569;
		--tw-prose-links: #06b6d4;
		--tw-prose-bold: #0f172a;
		--tw-prose-counters: #64748b;
		--tw-prose-bullets: #94a3b8;
		--tw-prose-hr: #e2e8f0;
		--tw-prose-quotes: #0f172a;
		--tw-prose-quote-borders: #06b6d4;
		--tw-prose-captions: #64748b;
		--tw-prose-code: #0f172a;
		--tw-prose-pre-code: #e2e8f0;
		--tw-prose-pre-bg: #1e293b;
		--tw-prose-th-borders: #cbd5e1;
		--tw-prose-td-borders: #e2e8f0;
	}

	:global(.dark) .preview :global(.prose) {
		--tw-prose-body: #cbd5e1;
		--tw-prose-headings: #f1f5f9;
		--tw-prose-lead: #94a3b8;
		--tw-prose-links: #06b6d4;
		--tw-prose-bold: #f1f5f9;
		--tw-prose-counters: #94a3b8;
		--tw-prose-bullets: #64748b;
		--tw-prose-hr: #334155;
		--tw-prose-quotes: #f1f5f9;
		--tw-prose-quote-borders: #06b6d4;
		--tw-prose-captions: #94a3b8;
		--tw-prose-code: #f1f5f9;
		--tw-prose-pre-code: #e2e8f0;
		--tw-prose-pre-bg: #0f172a;
		--tw-prose-th-borders: #475569;
		--tw-prose-td-borders: #334155;
	}

	.preview :global(.prose h1) {
		font-size: var(--h1-size, 2.25em);
		margin-top: 0;
		margin-bottom: 0.8em;
		font-weight: var(--h1-weight, 800);
		line-height: var(--h1-line-height, 1.2);
		color: var(--h1-color, #a78bfa);
	}

	.preview :global(.prose h2) {
		font-size: var(--h2-size, 1.875em);
		margin-top: 1.5em;
		margin-bottom: 0.8em;
		font-weight: var(--h2-weight, 700);
		line-height: var(--h2-line-height, 1.25);
		color: var(--h2-color, #60a5fa);
	}

	.preview :global(.prose h3) {
		font-size: var(--h3-size, 1.5em);
		margin-top: 1.4em;
		margin-bottom: 0.6em;
		font-weight: var(--h3-weight, 700);
		line-height: var(--h3-line-height, 1.3);
		color: var(--h3-color, #22d3ee);
	}

	.preview :global(.prose h4) {
		font-size: var(--h4-size, 1.25em);
		margin-top: 1.3em;
		margin-bottom: 0.5em;
		font-weight: var(--h4-weight, 600);
		line-height: var(--h4-line-height, 1.35);
		color: var(--h4-color, #34d399);
	}

	.preview :global(.prose h5) {
		font-size: var(--h5-size, 1.125em);
		margin-top: 1.2em;
		margin-bottom: 0.5em;
		font-weight: var(--h5-weight, 600);
		line-height: var(--h5-line-height, 1.4);
		color: var(--h5-color, #2dd4bf);
	}

	.preview :global(.prose h6) {
		font-size: var(--h6-size, 1em);
		margin-top: 1.2em;
		margin-bottom: 0.5em;
		font-weight: var(--h6-weight, 600);
		line-height: var(--h6-line-height, 1.4);
		color: var(--h6-color, #818cf8);
	}

	.preview :global(.prose p) {
		margin-top: 1em;
		margin-bottom: 1em;
		line-height: 1.75;
	}

	.preview :global(.prose a) {
		color: var(--link-color, var(--tw-prose-links));
		text-decoration: var(--link-decoration, underline);
		text-underline-offset: 2px;
		cursor: pointer;
	}

	.preview :global(.prose a:hover) {
		opacity: 0.8;
	}

	/* Hide anchor links inside headings */
	.preview :global(.prose .anchor) {
		display: none;
	}

	.preview :global(.prose code) {
		background: var(--code-bg, rgba(100, 100, 100, 0.15));
		color: var(--code-color, inherit);
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 0.9em;
		font-family: var(--code-font, ui-monospace, monospace);
	}

	.preview :global(.prose pre) {
		background: var(--code-block-bg, var(--tw-prose-pre-bg));
		padding: 1em 1.25em;
		border-radius: 8px;
		overflow-x: auto;
		margin: 1.5em 0;
	}

	.preview :global(.prose pre code) {
		background: transparent;
		padding: 0;
		border-radius: 0;
		font-size: 0.875em;
		line-height: 1.7;
	}

	.preview :global(.prose blockquote) {
		border-left: var(--blockquote-border-width, 3px) solid var(--blockquote-border, var(--tw-prose-quote-borders));
		padding-left: 1em;
		font-style: italic;
		margin: 1.5em 0;
	}

	.preview :global(.prose ul) {
		padding-left: 1.5em;
		margin: 1em 0;
		list-style: none;
	}

	.preview :global(.prose ul > li::before) {
		content: var(--list-bullet, '•');
		color: var(--list-color, #06b6d4);
		font-weight: 600;
		display: inline-block;
		width: 1em;
		margin-left: -1em;
	}

	.preview :global(.prose ol) {
		padding-left: 1.5em;
		margin: 1em 0;
	}

	.preview :global(.prose ol > li::marker) {
		color: var(--list-color, #06b6d4);
		font-weight: 600;
	}

	.preview :global(.prose li) {
		margin: 0.5em 0;
	}

	.preview :global(.prose hr) {
		border: none;
		border-top: 1px solid var(--tw-prose-hr);
		margin: 2em 0;
	}

	.preview :global(.prose table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1.5em 0;
	}

	.preview :global(.prose th),
	.preview :global(.prose td) {
		border: 1px solid var(--tw-prose-td-borders);
		padding: 0.5em 1em;
		text-align: left;
	}

	.preview :global(.prose th) {
		background: rgba(100, 100, 100, 0.1);
		font-weight: 600;
	}

	.preview :global(.prose img) {
		max-width: 100%;
		height: auto;
		border-radius: 8px;
		margin: 1.5em 0;
	}

	/* Special blocks container */
	.preview :global(.special-block) {
		margin: 1.5em 0;
		display: flex;
		justify-content: center;
		overflow: auto;
	}

	.preview :global(.special-block.mermaid svg) {
		max-width: 100%;
		height: auto;
	}

	.preview :global(.special-block.chart) {
		max-width: 100%;
		min-height: 200px;
	}

	/* Error states */
	.preview :global(.diagram-error),
	.preview :global(.chart-error) {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 1em;
		border-radius: 8px;
		font-family: ui-monospace, monospace;
		font-size: 0.875em;
		width: 100%;
	}

	:global(.dark) .preview :global(.diagram-error),
	:global(.dark) .preview :global(.chart-error) {
		background: #450a0a;
		border-color: #7f1d1d;
		color: #fca5a5;
	}

	/* Syntect syntax highlighting classes - Light theme */
	.preview :global(span.source) {
		color: #24292e;
	}
	.preview :global(span.keyword) {
		color: #d73a49;
	}
	.preview :global(span.string) {
		color: #032f62;
	}
	.preview :global(span.comment) {
		color: #6a737d;
		font-style: italic;
	}
	.preview :global(span.function) {
		color: #6f42c1;
	}
	.preview :global(span.constant) {
		color: #005cc5;
	}
	.preview :global(span.storage) {
		color: #d73a49;
	}
	.preview :global(span.support) {
		color: #005cc5;
	}
	.preview :global(span.variable) {
		color: #e36209;
	}
	.preview :global(span.entity) {
		color: #6f42c1;
	}
	.preview :global(span.punctuation) {
		color: #24292e;
	}

	/* Dark theme syntax highlighting */
	:global(.dark) .preview :global(span.source) {
		color: #e1e4e8;
	}
	:global(.dark) .preview :global(span.keyword) {
		color: #ff7b72;
	}
	:global(.dark) .preview :global(span.string) {
		color: #a5d6ff;
	}
	:global(.dark) .preview :global(span.comment) {
		color: #8b949e;
		font-style: italic;
	}
	:global(.dark) .preview :global(span.function) {
		color: #d2a8ff;
	}
	:global(.dark) .preview :global(span.constant) {
		color: #79c0ff;
	}
	:global(.dark) .preview :global(span.storage) {
		color: #ff7b72;
	}
	:global(.dark) .preview :global(span.support) {
		color: #79c0ff;
	}
	:global(.dark) .preview :global(span.variable) {
		color: #ffa657;
	}
	:global(.dark) .preview :global(span.entity) {
		color: #d2a8ff;
	}
	:global(.dark) .preview :global(span.punctuation) {
		color: #e1e4e8;
	}

	/* Text file preview styles */
	.preview :global(.text-file-preview) {
		background: var(--code-block-bg, var(--tw-prose-pre-bg));
		padding: 1.5em;
		border-radius: 8px;
		overflow-x: auto;
		margin: 0;
		min-height: 100%;
	}

	.preview :global(.text-file-preview code) {
		background: transparent;
		padding: 0;
		border-radius: 0;
		font-size: 0.9em;
		line-height: 1.7;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		color: var(--tw-prose-pre-code);
		white-space: pre-wrap;
		word-break: break-word;
	}

	/* Log viewer styles */
	.preview :global(.log-viewer) {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.preview :global(.log-empty) {
		color: #64748b;
		padding: 2rem;
		text-align: center;
	}

	.preview :global(.log-entry) {
		padding: 0.75rem 1rem;
		border-radius: 8px;
		margin-bottom: 0.5rem;
		border-left: 3px solid transparent;
		background: rgba(100, 100, 100, 0.05);
	}

	:global(.dark) .preview :global(.log-entry) {
		background: rgba(100, 100, 100, 0.1);
	}

	/* Level-specific styles */
	.preview :global(.log-level-info) {
		border-left-color: #3b82f6;
	}

	.preview :global(.log-level-warn) {
		border-left-color: #f59e0b;
		background: rgba(245, 158, 11, 0.08);
	}

	:global(.dark) .preview :global(.log-level-warn) {
		background: rgba(245, 158, 11, 0.12);
	}

	.preview :global(.log-level-error),
	.preview :global(.log-level-fatal) {
		border-left-color: #ef4444;
		background: rgba(239, 68, 68, 0.08);
	}

	:global(.dark) .preview :global(.log-level-error),
	:global(.dark) .preview :global(.log-level-fatal) {
		background: rgba(239, 68, 68, 0.12);
	}

	.preview :global(.log-level-debug) {
		border-left-color: #8b5cf6;
		background: rgba(139, 92, 246, 0.08);
	}

	:global(.dark) .preview :global(.log-level-debug) {
		background: rgba(139, 92, 246, 0.12);
	}

	.preview :global(.log-level-trace) {
		border-left-color: #6b7280;
		background: rgba(107, 114, 128, 0.08);
	}

	:global(.dark) .preview :global(.log-level-trace) {
		background: rgba(107, 114, 128, 0.12);
	}

	.preview :global(.log-header) {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.preview :global(.log-icon) {
		font-size: 1rem;
	}

	.preview :global(.log-timestamp) {
		color: #64748b;
		font-size: 0.8rem;
	}

	:global(.dark) .preview :global(.log-timestamp) {
		color: #94a3b8;
	}

	.preview :global(.log-module) {
		color: #06b6d4;
		font-weight: 600;
		font-size: 0.8rem;
		padding: 0.125rem 0.5rem;
		background: rgba(6, 182, 212, 0.15);
		border-radius: 4px;
	}

	.preview :global(.log-level-badge) {
		font-size: 0.7rem;
		font-weight: 700;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.preview :global(.log-level-info .log-level-badge) {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
	}

	:global(.dark) .preview :global(.log-level-info .log-level-badge) {
		background: rgba(59, 130, 246, 0.3);
		color: #60a5fa;
	}

	.preview :global(.log-level-warn .log-level-badge) {
		background: rgba(245, 158, 11, 0.2);
		color: #d97706;
	}

	:global(.dark) .preview :global(.log-level-warn .log-level-badge) {
		background: rgba(245, 158, 11, 0.3);
		color: #fbbf24;
	}

	.preview :global(.log-level-error .log-level-badge),
	.preview :global(.log-level-fatal .log-level-badge) {
		background: rgba(239, 68, 68, 0.2);
		color: #dc2626;
	}

	:global(.dark) .preview :global(.log-level-error .log-level-badge),
	:global(.dark) .preview :global(.log-level-fatal .log-level-badge) {
		background: rgba(239, 68, 68, 0.3);
		color: #f87171;
	}

	.preview :global(.log-level-debug .log-level-badge) {
		background: rgba(139, 92, 246, 0.2);
		color: #7c3aed;
	}

	:global(.dark) .preview :global(.log-level-debug .log-level-badge) {
		background: rgba(139, 92, 246, 0.3);
		color: #a78bfa;
	}

	.preview :global(.log-level-trace .log-level-badge) {
		background: rgba(107, 114, 128, 0.2);
		color: #4b5563;
	}

	:global(.dark) .preview :global(.log-level-trace .log-level-badge) {
		background: rgba(107, 114, 128, 0.3);
		color: #9ca3af;
	}

	.preview :global(.log-level-unknown .log-level-badge) {
		background: rgba(107, 114, 128, 0.15);
		color: #6b7280;
	}

	.preview :global(.log-message) {
		margin-top: 0.5rem;
		color: #334155;
		font-weight: 500;
	}

	:global(.dark) .preview :global(.log-message) {
		color: #e2e8f0;
	}

	.preview :global(.log-metadata) {
		margin-top: 0.5rem;
		padding-left: 0.5rem;
	}

	.preview :global(.log-meta-item) {
		display: flex;
		gap: 0.25rem;
		color: #64748b;
		font-size: 0.8rem;
	}

	:global(.dark) .preview :global(.log-meta-item) {
		color: #94a3b8;
	}

	.preview :global(.log-meta-prefix) {
		color: #94a3b8;
		user-select: none;
	}

	:global(.dark) .preview :global(.log-meta-prefix) {
		color: #64748b;
	}

	.preview :global(.log-meta-key) {
		color: #8b5cf6;
		font-weight: 500;
	}

	:global(.dark) .preview :global(.log-meta-key) {
		color: #a78bfa;
	}

	.preview :global(.log-meta-value) {
		color: #475569;
	}

	:global(.dark) .preview :global(.log-meta-value) {
		color: #cbd5e1;
	}
</style>
