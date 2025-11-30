import { storeService } from '$lib/services/store-service';
import type { StyleConfig, HeadingStyle } from '$lib/types';

// Default style configuration
const DEFAULT_STYLES: StyleConfig = {
	headings: {
		h1: {
			fontSize: '2.25em',
			fontWeight: 800,
			lineHeight: 1.2,
			colorLight: '#7c3aed', // violet
			colorDark: '#a78bfa'
		},
		h2: {
			fontSize: '1.875em',
			fontWeight: 700,
			lineHeight: 1.25,
			colorLight: '#2563eb', // blue
			colorDark: '#60a5fa'
		},
		h3: {
			fontSize: '1.5em',
			fontWeight: 700,
			lineHeight: 1.3,
			colorLight: '#0891b2', // cyan
			colorDark: '#22d3ee'
		},
		h4: {
			fontSize: '1.25em',
			fontWeight: 600,
			lineHeight: 1.35,
			colorLight: '#059669', // emerald
			colorDark: '#34d399'
		},
		h5: {
			fontSize: '1.125em',
			fontWeight: 600,
			lineHeight: 1.4,
			colorLight: '#0d9488', // teal
			colorDark: '#2dd4bf'
		},
		h6: {
			fontSize: '1em',
			fontWeight: 600,
			lineHeight: 1.4,
			colorLight: '#6366f1', // indigo
			colorDark: '#818cf8'
		}
	},
	link: {
		colorLight: '#0891b2',
		colorDark: '#06b6d4',
		underline: true
	},
	inlineCode: {
		backgroundLight: 'rgba(100, 100, 100, 0.15)',
		backgroundDark: 'rgba(148, 163, 184, 0.2)',
		colorLight: '#0f172a',
		colorDark: '#f1f5f9',
		fontFamily: 'ui-monospace, monospace'
	},
	blockquote: {
		borderColorLight: '#0891b2',
		borderColorDark: '#06b6d4',
		borderWidth: 3
	},
	list: {
		bulletChar: '•',
		numberStyle: 'decimal',
		colorLight: '#0891b2',
		colorDark: '#06b6d4'
	},
	codeBlock: {
		backgroundLight: '#1e293b',
		backgroundDark: '#0f172a'
	}
};

// Deep clone helper
function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

// Deep merge helper
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
	const result = { ...target };
	for (const key in source) {
		if (source[key] !== undefined) {
			if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
				result[key] = deepMerge(target[key] as object, source[key] as object) as T[Extract<keyof T, string>];
			} else {
				result[key] = source[key] as T[Extract<keyof T, string>];
			}
		}
	}
	return result;
}

class StylesStore {
	private _config = $state<StyleConfig>(deepClone(DEFAULT_STYLES));

	get config(): StyleConfig {
		return this._config;
	}

	// Convenience getters
	get headings() {
		return this._config.headings;
	}

	get link() {
		return this._config.link;
	}

	get inlineCode() {
		return this._config.inlineCode;
	}

	get blockquote() {
		return this._config.blockquote;
	}

	get list() {
		return this._config.list;
	}

	get codeBlock() {
		return this._config.codeBlock;
	}

	async init() {
		const stored = await storeService.get<StyleConfig>('styles');
		if (stored) {
			// Merge stored with defaults to handle new properties
			this._config = deepMerge(deepClone(DEFAULT_STYLES), stored);
		}
	}

	// Update a specific heading style
	updateHeading(level: 1 | 2 | 3 | 4 | 5 | 6, updates: Partial<HeadingStyle>) {
		const key = `h${level}` as keyof StyleConfig['headings'];
		this._config.headings[key] = { ...this._config.headings[key], ...updates };
		this.persist();
	}

	// Update link style
	updateLink(updates: Partial<StyleConfig['link']>) {
		this._config.link = { ...this._config.link, ...updates };
		this.persist();
	}

	// Update inline code style
	updateInlineCode(updates: Partial<StyleConfig['inlineCode']>) {
		this._config.inlineCode = { ...this._config.inlineCode, ...updates };
		this.persist();
	}

	// Update blockquote style
	updateBlockquote(updates: Partial<StyleConfig['blockquote']>) {
		this._config.blockquote = { ...this._config.blockquote, ...updates };
		this.persist();
	}

	// Update list style
	updateList(updates: Partial<StyleConfig['list']>) {
		this._config.list = { ...this._config.list, ...updates };
		this.persist();
	}

	// Update code block style
	updateCodeBlock(updates: Partial<StyleConfig['codeBlock']>) {
		this._config.codeBlock = { ...this._config.codeBlock, ...updates };
		this.persist();
	}

	// Reset to defaults
	resetToDefaults() {
		this._config = deepClone(DEFAULT_STYLES);
		this.persist();
	}

	// Reset a specific section
	resetSection(section: keyof StyleConfig) {
		if (section === 'headings') {
			this._config.headings = deepClone(DEFAULT_STYLES.headings);
		} else if (section === 'link') {
			this._config.link = deepClone(DEFAULT_STYLES.link);
		} else if (section === 'inlineCode') {
			this._config.inlineCode = deepClone(DEFAULT_STYLES.inlineCode);
		} else if (section === 'blockquote') {
			this._config.blockquote = deepClone(DEFAULT_STYLES.blockquote);
		} else if (section === 'list') {
			this._config.list = deepClone(DEFAULT_STYLES.list);
		} else if (section === 'codeBlock') {
			this._config.codeBlock = deepClone(DEFAULT_STYLES.codeBlock);
		}
		this.persist();
	}

	// Get color based on theme
	getHeadingColor(level: 1 | 2 | 3 | 4 | 5 | 6, isDark: boolean): string {
		const key = `h${level}` as keyof StyleConfig['headings'];
		return isDark ? this._config.headings[key].colorDark : this._config.headings[key].colorLight;
	}

	getLinkColor(isDark: boolean): string {
		return isDark ? this._config.link.colorDark : this._config.link.colorLight;
	}

	getListColor(isDark: boolean): string {
		return isDark ? this._config.list.colorDark : this._config.list.colorLight;
	}

	getInlineCodeBackground(isDark: boolean): string {
		return isDark ? this._config.inlineCode.backgroundDark : this._config.inlineCode.backgroundLight;
	}

	getBlockquoteBorderColor(isDark: boolean): string {
		return isDark ? this._config.blockquote.borderColorDark : this._config.blockquote.borderColorLight;
	}

	getCodeBlockBackground(isDark: boolean): string {
		return isDark ? this._config.codeBlock.backgroundDark : this._config.codeBlock.backgroundLight;
	}

	private async persist() {
		await storeService.set<StyleConfig>('styles', this._config);
	}
}

export const stylesStore = new StylesStore();
export { DEFAULT_STYLES };
