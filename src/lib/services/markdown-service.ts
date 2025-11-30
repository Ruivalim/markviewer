import { invoke } from '@tauri-apps/api/core';

export interface SpecialBlock {
	block_type: string;
	content: string;
	placeholder_id: string;
}

export interface RenderResult {
	html: string;
	special_blocks: SpecialBlock[];
}

interface RenderOptions {
	theme: string;
	base_path: string | null;
}

class MarkdownService {
	private cache = new Map<string, RenderResult>();
	private maxCacheSize = 50;

	/**
	 * Render markdown to HTML using the Rust backend
	 * @param markdown The markdown content
	 * @param basePath Path to the .md file for resolving relative image paths
	 * @param theme Current theme ('light' or 'dark')
	 */
	async render(markdown: string, basePath: string | null = null, theme: string = 'light'): Promise<RenderResult> {
		// Create a cache key based on content hash
		const cacheKey = `${markdown.length}:${basePath}:${theme}:${this.simpleHash(markdown)}`;

		if (this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey)!;
		}

		try {
			const result = await invoke<RenderResult>('render_markdown', {
				markdown,
				options: {
					theme,
					base_path: basePath
				} as RenderOptions
			});

			// LRU-style cache management
			if (this.cache.size >= this.maxCacheSize) {
				const firstKey = this.cache.keys().next().value;
				if (firstKey) this.cache.delete(firstKey);
			}

			this.cache.set(cacheKey, result);
			return result;
		} catch (error) {
			console.error('Markdown render error:', error);
			// Return a fallback result with escaped content
			return {
				html: `<pre>${this.escapeHtml(markdown)}</pre>`,
				special_blocks: []
			};
		}
	}

	/**
	 * Count words in text (for status bar)
	 */
	countWords(text: string): number {
		// const cleaned = text.replace(/[#*`\[\]()_~>-]/g, ' ');
		const cleaned = text.replace(/[#*`[\]()_~>-]/g, ' ');
		const words = cleaned.split(/\s+/).filter((word) => word.length > 0);
		return words.length;
	}

	/**
	 * Count characters in text (for status bar)
	 */
	countCharacters(text: string): number {
		return text.length;
	}

	/**
	 * Clear the render cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Simple hash function for cache keys
	 */
	private simpleHash(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
	}

	/**
	 * Escape HTML for fallback rendering
	 */
	private escapeHtml(text: string): string {
		return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
	}
}

export const markdownService = new MarkdownService();
