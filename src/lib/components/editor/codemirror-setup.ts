import {
	EditorView,
	Decoration,
	type DecorationSet,
	ViewPlugin,
	type ViewUpdate,
	keymap,
	lineNumbers,
	highlightActiveLine,
	highlightActiveLineGutter,
	drawSelection,
	dropCursor,
	rectangularSelection,
	crosshairCursor,
	highlightSpecialChars
} from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxTree, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { RangeSetBuilder, type Extension, Compartment } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap, search } from '@codemirror/search';

// Heading styles by level
const headingStyles: Record<number, string> = {
	1: 'font-size: 1.875em; font-weight: 700; line-height: 1.2;',
	2: 'font-size: 1.5em; font-weight: 700; line-height: 1.3;',
	3: 'font-size: 1.25em; font-weight: 600; line-height: 1.4;',
	4: 'font-size: 1.125em; font-weight: 600; line-height: 1.4;',
	5: 'font-size: 1em; font-weight: 600; line-height: 1.5;',
	6: 'font-size: 0.875em; font-weight: 600; line-height: 1.5;'
};

// Heading colors by level (gradient from purple to cyan)
const headingColors: Record<number, { light: string; dark: string }> = {
	1: { light: '#7c3aed', dark: '#a78bfa' }, // violet
	2: { light: '#2563eb', dark: '#60a5fa' }, // blue
	3: { light: '#0891b2', dark: '#22d3ee' }, // cyan
	4: { light: '#059669', dark: '#34d399' }, // emerald
	5: { light: '#0d9488', dark: '#2dd4bf' }, // teal
	6: { light: '#6366f1', dark: '#818cf8' } // indigo
};

// Create decorations
const headingDecoration = (level: number, isDark: boolean) =>
	Decoration.mark({
		class: `cm-heading cm-heading-${level}`,
		attributes: {
			style: `${headingStyles[level] || headingStyles[1]} color: ${isDark ? headingColors[level]?.dark : headingColors[level]?.light || '#0f172a'};`
		}
	});

const boldDecoration = Decoration.mark({
	class: 'cm-strong',
	attributes: { style: 'font-weight: 700;' }
});

const italicDecoration = Decoration.mark({
	class: 'cm-emphasis',
	attributes: { style: 'font-style: italic;' }
});

const strikethroughDecoration = Decoration.mark({
	class: 'cm-strikethrough',
	attributes: { style: 'text-decoration: line-through; opacity: 0.6;' }
});

const codeDecoration = Decoration.mark({
	class: 'cm-inline-code',
	attributes: {
		style: 'background: rgba(100, 100, 100, 0.15); padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 0.9em;'
	}
});

const linkDecoration = Decoration.mark({
	class: 'cm-link',
	attributes: { style: 'color: #06b6d4; text-decoration: underline; cursor: pointer;' }
});

const imageDecoration = Decoration.mark({
	class: 'cm-image',
	attributes: { style: 'color: #10b981;' } // emerald for images
});

const blockquoteDecoration = Decoration.line({
	class: 'cm-blockquote',
	attributes: {
		style: 'border-left: 3px solid #06b6d4; padding-left: 1em; opacity: 0.85; font-style: italic;'
	}
});

const hrDecoration = Decoration.line({
	class: 'cm-hr',
	attributes: { style: 'opacity: 0.5;' }
});

const listMarkerDecoration = Decoration.mark({
	class: 'cm-list-marker',
	attributes: { style: 'color: #06b6d4; font-weight: 500;' }
});

const codeInfoDecoration = Decoration.mark({
	class: 'cm-code-info',
	attributes: { style: 'color: #8b5cf6; font-style: italic; font-size: 0.9em;' } // violet
});

const taskMarkerDecoration = Decoration.mark({
	class: 'cm-task-marker',
	attributes: { style: 'color: #f59e0b; font-family: ui-monospace, monospace;' } // amber
});

const hashtagDecoration = Decoration.mark({
	class: 'cm-hashtag',
	attributes: { style: 'color: #ec4899; font-weight: 500;' } // pink
});

const mentionDecoration = Decoration.mark({
	class: 'cm-mention',
	attributes: { style: 'color: #3b82f6; font-weight: 500;' } // blue
});

// Create the markdown decorator plugin with theme awareness
const createMarkdownDecorator = (isDark: boolean) =>
	ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				const builder = new RangeSetBuilder<Decoration>();

				for (const { from, to } of view.visibleRanges) {
					syntaxTree(view.state).iterate({
						from,
						to,
						enter(node) {
							// Headings with colored levels
							if (node.name.startsWith('ATXHeading')) {
								const level = parseInt(node.name.replace('ATXHeading', '')) || 1;
								builder.add(node.from, node.to, headingDecoration(level, isDark));
							}

							// Bold
							if (node.name === 'StrongEmphasis') {
								builder.add(node.from, node.to, boldDecoration);
							}

							// Italic
							if (node.name === 'Emphasis') {
								builder.add(node.from, node.to, italicDecoration);
							}

							// Strikethrough
							if (node.name === 'Strikethrough') {
								builder.add(node.from, node.to, strikethroughDecoration);
							}

							// Inline code
							if (node.name === 'InlineCode') {
								builder.add(node.from, node.to, codeDecoration);
							}

							// Links (but not images)
							if (node.name === 'Link' || node.name === 'URL') {
								builder.add(node.from, node.to, linkDecoration);
							}

							// Images - different color from links
							if (node.name === 'Image') {
								builder.add(node.from, node.to, imageDecoration);
							}

							// Blockquote lines
							if (node.name === 'Blockquote') {
								const line = view.state.doc.lineAt(node.from);
								builder.add(line.from, line.from, blockquoteDecoration);
							}

							// Horizontal rule
							if (node.name === 'HorizontalRule') {
								builder.add(node.from, node.from, hrDecoration);
							}

							// List markers (-, *, +, numbers)
							if (node.name === 'ListMark') {
								builder.add(node.from, node.to, listMarkerDecoration);
							}

							// Code fence info string (language)
							if (node.name === 'CodeInfo') {
								builder.add(node.from, node.to, codeInfoDecoration);
							}

							// Task list markers [ ] or [x]
							if (node.name === 'TaskMarker') {
								builder.add(node.from, node.to, taskMarkerDecoration);
							}
						}
					});

					// Custom patterns: hashtags and mentions
					const text = view.state.doc.sliceString(from, to);
					const hashtagRegex = /#\w+/g;
					const mentionRegex = /@\w+/g;

					let match;
					while ((match = hashtagRegex.exec(text)) !== null) {
						const start = from + match.index;
						const end = start + match[0].length;
						builder.add(start, end, hashtagDecoration);
					}

					while ((match = mentionRegex.exec(text)) !== null) {
						const start = from + match.index;
						const end = start + match[0].length;
						builder.add(start, end, mentionDecoration);
					}
				}

				return builder.finish();
			}
		},
		{
			decorations: (v) => v.decorations
		}
	);

const linkClickHandler = EditorView.domEventHandlers({
	click: (event, view) => {
		const target = event.target as HTMLElement;
		if (target.classList.contains('cm-link') || target.closest('.cm-link')) {
			if (event.metaKey || event.ctrlKey) {
				const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
				if (pos !== null) {
					const line = view.state.doc.lineAt(pos);
					const urlMatch = line.text.match(/\[.*?\]\((.*?)\)/);
					if (urlMatch && urlMatch[1]) {
						window.open(urlMatch[1], '_blank');
						event.preventDefault();
					}
				}
			}
		}
		return false;
	}
});

const createLightTheme = (fontSize: number) =>
	EditorView.theme({
		'&': {
			backgroundColor: '#ffffff',
			color: '#1e293b',
			height: '100%'
		},
		'.cm-content': {
			fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
			fontSize: `${fontSize}px`,
			padding: '16px 0',
			lineHeight: '1.7',
			caretColor: '#06b6d4'
		},
		'.cm-cursor': {
			borderLeftColor: '#06b6d4'
		},
		'.cm-heading': {
			color: '#0f172a'
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
		// Syntax highlighting colors for fenced code blocks
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
				fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
				fontSize: `${fontSize}px`,
				padding: '16px 0',
				lineHeight: '1.7',
				caretColor: '#06b6d4'
			},
			'.cm-cursor': {
				borderLeftColor: '#06b6d4'
			},
			'.cm-heading': {
				color: '#f1f5f9'
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
			'.cm-inline-code': {
				backgroundColor: 'rgba(148, 163, 184, 0.2)'
			},
			'.cm-line': {
				paddingLeft: '16px',
				paddingRight: '16px'
			},
			// Syntax highlighting colors for fenced code blocks (dark)
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

// Theme compartment for dynamic theme switching without recreating editor
export const themeCompartment = new Compartment();

// Decorator compartment for theme-aware decorations
export const decoratorCompartment = new Compartment();

export function getThemeExtension(isDark: boolean, fontSize: number): Extension {
	return isDark ? [oneDark, createDarkTheme(fontSize)] : [syntaxHighlighting(defaultHighlightStyle, { fallback: true }), createLightTheme(fontSize)];
}

export function createEditorExtensions(isDark: boolean, onChange: (content: string) => void, onSave?: () => void, fontSize: number = 15): Extension[] {
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
		rectangularSelection(),
		crosshairCursor(),
		highlightActiveLine(),
		highlightSelectionMatches(),

		// Keymaps
		keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
		saveKeymap,

		// Search
		search(),

		// Markdown
		markdown({ base: markdownLanguage, codeLanguages: languages }),
		decoratorCompartment.of(createMarkdownDecorator(isDark)),
		linkClickHandler,

		// Theme (using compartment for dynamic updates)
		themeCompartment.of(getThemeExtension(isDark, fontSize)),

		// Change listener with debounce for better performance
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
		EditorView.lineWrapping,

		// Paste handler - convert URLs to markdown links
		EditorView.domEventHandlers({
			paste(event, view) {
				const clipboardData = event.clipboardData;
				if (!clipboardData) return false;

				const text = clipboardData.getData('text/plain');
				if (!text) return false;

				// Check if it's a URL
				const urlRegex = /^https?:\/\/[^\s]+$/;
				if (!urlRegex.test(text.trim())) return false;

				const url = text.trim();
				const selection = view.state.selection.main;
				const selectedText = view.state.sliceDoc(selection.from, selection.to);

				event.preventDefault();

				// If there's selected text, use it as the link title
				if (selectedText && selection.from !== selection.to) {
					const markdownLink = `[${selectedText}](${url})`;
					view.dispatch({
						changes: { from: selection.from, to: selection.to, insert: markdownLink },
						selection: { anchor: selection.from + markdownLink.length }
					});
				} else {
					// No selection - create link with domain as title
					const urlTitle = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
					const markdownLink = `[${urlTitle}](${url})`;
					view.dispatch({
						changes: { from: selection.from, to: selection.to, insert: markdownLink },
						selection: { anchor: selection.from + markdownLink.length }
					});
				}

				return true;
			}
		})
	];
}

// Helper to update decorator when theme changes
export function getDecoratorExtension(isDark: boolean): Extension {
	return createMarkdownDecorator(isDark);
}
