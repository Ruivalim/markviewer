import {
	EditorView,
	keymap,
	lineNumbers,
	highlightActiveLine,
	highlightActiveLineGutter,
	drawSelection,
	dropCursor,
	highlightSpecialChars,
	type ViewUpdate
} from '@codemirror/view';
import { defaultHighlightStyle, syntaxHighlighting, LanguageSupport } from '@codemirror/language';
import { type Extension, Compartment } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap, search } from '@codemirror/search';

// Language imports
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';

import type { CodeLanguage } from '$lib/types';

// Get language extension based on language identifier
function getLanguageExtension(lang: CodeLanguage): LanguageSupport | null {
	switch (lang) {
		case 'json':
			return json();
		case 'yaml':
		case 'toml':
			return yaml();
		default:
			return null;
	}
}

const createLightTheme = (fontSize: number) =>
	EditorView.theme({
		'&': {
			backgroundColor: '#ffffff',
			color: '#1e293b',
			height: '100%'
		},
		'.cm-content': {
			fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace",
			fontSize: `${fontSize}px`,
			padding: '16px 0',
			lineHeight: '1.6',
			caretColor: '#06b6d4'
		},
		'.cm-cursor': {
			borderLeftColor: '#06b6d4'
		},
		'.cm-gutters': {
			backgroundColor: '#f8fafc',
			borderRight: '1px solid #e2e8f0',
			color: '#94a3b8',
			fontSize: `${fontSize}px`,
			userSelect: 'none'
		},
		'.cm-lineNumbers .cm-gutterElement': {
			paddingLeft: '12px',
			paddingRight: '8px',
			minWidth: '40px'
		},
		'.cm-activeLineGutter': {
			backgroundColor: '#e2e8f0'
		},
		'.cm-activeLine': {
			backgroundColor: 'rgba(6, 182, 212, 0.05)'
		},
		'.cm-selectionBackground': {
			backgroundColor: 'rgba(6, 182, 212, 0.2) !important'
		},
		'&.cm-focused .cm-selectionBackground': {
			backgroundColor: 'rgba(6, 182, 212, 0.25) !important'
		},
		'.cm-line': {
			paddingLeft: '16px',
			paddingRight: '16px'
		},
		// Syntax highlighting colors for config files
		'.cm-keyword': { color: '#d73a49' },
		'.cm-string': { color: '#032f62' },
		'.cm-comment': { color: '#6a737d', fontStyle: 'italic' },
		'.cm-variableName': { color: '#e36209' },
		'.cm-typeName': { color: '#6f42c1' },
		'.cm-propertyName': { color: '#005cc5' },
		'.cm-number': { color: '#005cc5' },
		'.cm-operator': { color: '#d73a49' },
		'.cm-punctuation': { color: '#24292e' },
		'.cm-meta': { color: '#6a737d' },
		'.cm-bool': { color: '#d73a49' },
		'.cm-null': { color: '#d73a49' }
	});

const createDarkTheme = (fontSize: number) =>
	EditorView.theme(
		{
			'&': {
				backgroundColor: '#0f172a',
				color: '#e2e8f0',
				height: '100%'
			},
			'.cm-content': {
				fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace",
				fontSize: `${fontSize}px`,
				padding: '16px 0',
				lineHeight: '1.6',
				caretColor: '#06b6d4'
			},
			'.cm-cursor': {
				borderLeftColor: '#06b6d4'
			},
			'.cm-gutters': {
				backgroundColor: '#0f172a',
				borderRight: '1px solid #1e293b',
				color: '#475569',
				fontSize: `${fontSize}px`,
				userSelect: 'none'
			},
			'.cm-lineNumbers .cm-gutterElement': {
				paddingLeft: '12px',
				paddingRight: '8px',
				minWidth: '40px'
			},
			'.cm-activeLineGutter': {
				backgroundColor: '#1e293b'
			},
			'.cm-activeLine': {
				backgroundColor: 'rgba(6, 182, 212, 0.08)'
			},
			'.cm-selectionBackground': {
				backgroundColor: 'rgba(6, 182, 212, 0.25) !important'
			},
			'&.cm-focused .cm-selectionBackground': {
				backgroundColor: 'rgba(6, 182, 212, 0.35) !important'
			},
			'.cm-line': {
				paddingLeft: '16px',
				paddingRight: '16px'
			},
			// Syntax highlighting colors (dark)
			'.cm-keyword': { color: '#ff7b72' },
			'.cm-string': { color: '#a5d6ff' },
			'.cm-comment': { color: '#8b949e', fontStyle: 'italic' },
			'.cm-variableName': { color: '#ffa657' },
			'.cm-typeName': { color: '#d2a8ff' },
			'.cm-propertyName': { color: '#79c0ff' },
			'.cm-number': { color: '#79c0ff' },
			'.cm-operator': { color: '#ff7b72' },
			'.cm-punctuation': { color: '#e1e4e8' },
			'.cm-meta': { color: '#8b949e' },
			'.cm-bool': { color: '#ff7b72' },
			'.cm-null': { color: '#ff7b72' }
		},
		{ dark: true }
	);

// Theme compartment for dynamic theme switching
export const configThemeCompartment = new Compartment();

export function getConfigThemeExtension(isDark: boolean, fontSize: number): Extension {
	return isDark
		? [oneDark, createDarkTheme(fontSize)]
		: [syntaxHighlighting(defaultHighlightStyle, { fallback: true }), createLightTheme(fontSize)];
}

export function createConfigEditorExtensions(
	language: CodeLanguage,
	isDark: boolean,
	onChange: (content: string) => void,
	onSave?: () => void,
	fontSize: number = 15
): Extension[] {
	const langExtension = getLanguageExtension(language);

	const saveKeymap = onSave
		? keymap.of([
				{
					key: 'Mod-s',
					run: () => {
						onSave();
						return true;
					}
				}
			])
		: [];

	return [
		// Core extensions
		lineNumbers(),
		highlightActiveLineGutter(),
		highlightSpecialChars(),
		history(),
		drawSelection(),
		dropCursor(),
		highlightActiveLine(),
		highlightSelectionMatches(),

		// Keymaps
		keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
		saveKeymap,

		// Search
		search(),

		// Language support
		...(langExtension ? [langExtension] : []),

		// Theme
		configThemeCompartment.of(getConfigThemeExtension(isDark, fontSize)),

		// Change listener with debounce
		EditorView.updateListener.of(
			(() => {
				let debounceTimer: ReturnType<typeof setTimeout> | null = null;
				return (update: ViewUpdate) => {
					if (update.docChanged) {
						if (debounceTimer) clearTimeout(debounceTimer);
						debounceTimer = setTimeout(() => {
							onChange(update.state.doc.toString());
						}, 150);
					}
				};
			})()
		),

		// Line wrapping
		EditorView.lineWrapping
	];
}
