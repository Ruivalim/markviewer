import {
	EditorView,
	keymap,
	lineNumbers,
	highlightActiveLine,
	highlightActiveLineGutter,
	drawSelection,
	highlightSpecialChars
} from '@codemirror/view';
import { defaultHighlightStyle, syntaxHighlighting, LanguageSupport } from '@codemirror/language';
import { type Extension, Compartment, EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap, search } from '@codemirror/search';

// Language imports
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { sql } from '@codemirror/lang-sql';
import { markdown } from '@codemirror/lang-markdown';
import { php } from '@codemirror/lang-php';

import type { CodeLanguage } from '$lib/types';

// Get language extension based on language identifier
function getLanguageExtension(lang: CodeLanguage): LanguageSupport | null {
	switch (lang) {
		case 'javascript':
		case 'jsx':
			return javascript({ jsx: true });
		case 'typescript':
		case 'tsx':
			return javascript({ jsx: true, typescript: true });
		case 'python':
			return python();
		case 'rust':
			return rust();
		case 'go':
			return go();
		case 'java':
			return java();
		case 'c':
		case 'cpp':
		case 'csharp':
			return cpp();
		case 'html':
		case 'svelte':
		case 'vue':
			return html();
		case 'css':
		case 'scss':
			return css();
		case 'json':
			return json();
		case 'yaml':
		case 'toml':
			return yaml();
		case 'sql':
			return sql();
		case 'php':
			return php();
		case 'bash':
		case 'shell':
			// Use markdown as fallback for shell scripts
			return markdown();
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
		// Syntax highlighting colors
		'.cm-keyword': { color: '#d73a49' },
		'.cm-string': { color: '#032f62' },
		'.cm-comment': { color: '#6a737d', fontStyle: 'italic' },
		'.cm-variableName': { color: '#e36209' },
		'.cm-typeName': { color: '#6f42c1' },
		'.cm-propertyName': { color: '#005cc5' },
		'.cm-number': { color: '#005cc5' },
		'.cm-operator': { color: '#d73a49' },
		'.cm-punctuation': { color: '#24292e' },
		'.cm-meta': { color: '#6a737d' }
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
			'.cm-meta': { color: '#8b949e' }
		},
		{ dark: true }
	);

// Theme compartment for dynamic theme switching
export const codeThemeCompartment = new Compartment();

export function getCodeThemeExtension(isDark: boolean, fontSize: number): Extension {
	return isDark
		? [oneDark, createDarkTheme(fontSize)]
		: [syntaxHighlighting(defaultHighlightStyle, { fallback: true }), createLightTheme(fontSize)];
}

export function createCodeViewerExtensions(
	language: CodeLanguage,
	isDark: boolean,
	fontSize: number = 15
): Extension[] {
	const langExtension = getLanguageExtension(language);

	return [
		// Core extensions
		lineNumbers(),
		highlightActiveLineGutter(),
		highlightSpecialChars(),
		history(),
		drawSelection(),
		highlightActiveLine(),
		highlightSelectionMatches(),

		// Read-only state
		EditorState.readOnly.of(true),

		// Keymaps (for search, copy, etc.)
		keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),

		// Search
		search(),

		// Language support
		...(langExtension ? [langExtension] : []),

		// Theme
		codeThemeCompartment.of(getCodeThemeExtension(isDark, fontSize)),

		// Line wrapping
		EditorView.lineWrapping
	];
}
