import { EditorView, Decoration, type DecorationSet, ViewPlugin, type ViewUpdate, WidgetType, keymap, highlightActiveLine, drawSelection, dropCursor, highlightSpecialChars } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxTree, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { type Extension, Compartment, RangeSetBuilder, StateField } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap, search } from '@codemirror/search';
import { stylesStore } from '$lib/stores/styles.svelte';
import type { StyleConfig } from '$lib/types';

// Theme compartment for dynamic theme switching
export const liveThemeCompartment = new Compartment();
export const liveDecoratorCompartment = new Compartment();
export const liveSpellCheckCompartment = new Compartment();

// Create decoration that hides syntax markers on inactive lines
const hiddenDecoration = Decoration.mark({ class: 'cm-md-hidden' });

// Get style config (with fallback to store or defaults)
function getStyleConfig(): StyleConfig {
	return stylesStore.config;
}

// Rendered content decorations - now use style config
const createHeadingDecoration = (level: number, isDark: boolean) => {
	const styles = getStyleConfig();
	const key = `h${level}` as keyof StyleConfig['headings'];
	const headingStyle = styles.headings[key];
	const color = isDark ? headingStyle.colorDark : headingStyle.colorLight;

	return Decoration.mark({
		class: `cm-rendered-heading-${level}`,
		attributes: {
			style: `font-size: ${headingStyle.fontSize} !important; font-weight: ${headingStyle.fontWeight} !important; line-height: ${headingStyle.lineHeight} !important; color: ${color} !important;`
		}
	});
};

const createBoldDecoration = () => Decoration.mark({ class: 'cm-rendered-bold' });
const createItalicDecoration = () => Decoration.mark({ class: 'cm-rendered-italic' });
const createStrikethroughDecoration = () => Decoration.mark({ class: 'cm-rendered-strikethrough' });

const createCodeDecoration = (isDark: boolean) => {
	const styles = getStyleConfig();
	const bg = isDark ? styles.inlineCode.backgroundDark : styles.inlineCode.backgroundLight;
	const color = isDark ? styles.inlineCode.colorDark : styles.inlineCode.colorLight;

	return Decoration.mark({
		class: 'cm-rendered-code',
		attributes: {
			style: `background: ${bg}; color: ${color}; font-family: ${styles.inlineCode.fontFamily}; padding: 2px 6px; border-radius: 4px; font-size: 0.9em;`
		}
	});
};

const createLinkDecoration = (isDark: boolean) => {
	const styles = getStyleConfig();
	const color = isDark ? styles.link.colorDark : styles.link.colorLight;
	const textDecoration = styles.link.underline ? 'underline' : 'none';

	return Decoration.mark({
		class: 'cm-rendered-link',
		attributes: {
			style: `color: ${color}; text-decoration: ${textDecoration}; cursor: pointer;`
		}
	});
};

// Widget for checkboxes
class CheckboxWidget extends WidgetType {
	constructor(
		readonly checked: boolean,
		readonly isDark: boolean
	) {
		super();
	}

	toDOM() {
		const styles = getStyleConfig();
		const color = this.isDark ? styles.list.colorDark : styles.list.colorLight;

		const span = document.createElement('span');
		span.className = this.checked ? 'cm-rendered-checkbox-checked' : 'cm-rendered-checkbox';
		span.textContent = this.checked ? '☑ ' : '☐ ';
		span.style.color = color;
		return span;
	}

	eq(other: CheckboxWidget) {
		return other.checked === this.checked && other.isDark === this.isDark;
	}
}

// Widget for list markers (bullets)
class ListMarkerWidget extends WidgetType {
	constructor(
		readonly marker: string,
		readonly isDark: boolean
	) {
		super();
	}

	toDOM() {
		const styles = getStyleConfig();
		const color = this.isDark ? styles.list.colorDark : styles.list.colorLight;

		const span = document.createElement('span');
		span.className = 'cm-rendered-list-marker';
		span.textContent = styles.list.bulletChar + ' ';
		span.style.color = color;
		span.style.fontWeight = '600';
		return span;
	}

	eq(other: ListMarkerWidget) {
		return other.marker === this.marker && other.isDark === this.isDark;
	}
}

// Widget for inline images - renders below the line
class ImageWidget extends WidgetType {
	constructor(
		readonly src: string,
		readonly alt: string,
		readonly basePath: string | null
	) {
		super();
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-image-widget';

		const img = document.createElement('img');

		// Resolve the image path
		const imageSrc = this.src;
		if (!this.src.startsWith('http://') && !this.src.startsWith('https://') && !this.src.startsWith('data:')) {
			// Local file - need to use asset protocol
			if (this.basePath) {
				const baseDir = this.basePath.substring(0, this.basePath.lastIndexOf('/'));
				const fullPath = this.src.startsWith('/') ? this.src : `${baseDir}/${this.src}`;
				// Use Tauri's asset protocol
				import('@tauri-apps/api/core').then(({ convertFileSrc }) => {
					img.src = convertFileSrc(fullPath);
				});
			} else {
				img.src = this.src;
			}
		} else {
			img.src = imageSrc;
		}

		img.alt = this.alt;
		img.className = 'cm-image-preview';
		img.onerror = () => {
			container.innerHTML = `<span class="cm-image-error">Image not found: ${this.alt || this.src}</span>`;
		};

		container.appendChild(img);
		return container;
	}

	eq(other: ImageWidget) {
		return other.src === this.src && other.alt === this.alt;
	}
}

// Widget for charts - renders inline
class ChartWidget extends WidgetType {
	constructor(
		readonly chartConfig: string,
		readonly chartId: string
	) {
		super();
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-chart-widget';

		const canvas = document.createElement('canvas');
		canvas.id = this.chartId;
		canvas.style.width = '100%';
		canvas.style.maxWidth = '400px';
		canvas.style.height = '250px';
		container.appendChild(canvas);

		// Render chart asynchronously
		const chartConfig = this.chartConfig;
		setTimeout(() => {
			try {
				const config = JSON.parse(chartConfig);
				import('$lib/services/chart-service')
					.then(({ chartService }) => {
						chartService.renderChart(canvas, config);
					})
					.catch((err) => {
						console.error('Failed to load chart service:', err);
						container.innerHTML = `<span class="cm-chart-error">Failed to load chart</span>`;
					});
			} catch (e) {
				console.error('Invalid chart JSON:', e);
				container.innerHTML = `<span class="cm-chart-error">Invalid chart config: ${e}</span>`;
			}
		}, 50);

		return container;
	}

	eq(other: ChartWidget) {
		return other.chartConfig === this.chartConfig;
	}

	destroy() {
		// Chart.js cleanup if needed
	}
}

// Widget for mermaid diagrams
class MermaidWidget extends WidgetType {
	constructor(
		readonly mermaidCode: string,
		readonly mermaidId: string
	) {
		super();
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-mermaid-widget';

		// Render mermaid asynchronously
		const mermaidCode = this.mermaidCode;
		const mermaidId = this.mermaidId;

		import('$lib/services/mermaid-service')
			.then(({ mermaidService }) => {
				mermaidService.render(mermaidId, mermaidCode).then((svg) => {
					container.innerHTML = svg;
				});
			})
			.catch((err) => {
				console.error('Failed to load mermaid service:', err);
				container.innerHTML = `<span class="cm-mermaid-error">Failed to load diagram</span>`;
			});

		return container;
	}

	eq(other: MermaidWidget) {
		return other.mermaidCode === this.mermaidCode;
	}
}

// Widget for markdown tables
class TableWidget extends WidgetType {
	constructor(
		readonly tableMarkdown: string,
		readonly isDark: boolean
	) {
		super();
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-table-widget';

		const lines = this.tableMarkdown.trim().split('\n');
		if (lines.length < 2) {
			container.textContent = this.tableMarkdown;
			return container;
		}

		const table = document.createElement('table');
		table.className = 'cm-rendered-table';

		// Parse header row
		const headerRow = this.parseRow(lines[0]);
		if (headerRow.length === 0) {
			container.textContent = this.tableMarkdown;
			return container;
		}

		// Create thead
		const thead = document.createElement('thead');
		const headerTr = document.createElement('tr');
		for (const cell of headerRow) {
			const th = document.createElement('th');
			th.textContent = cell.trim();
			headerTr.appendChild(th);
		}
		thead.appendChild(headerTr);
		table.appendChild(thead);

		// Skip separator line (line 1) and parse body rows
		const tbody = document.createElement('tbody');
		for (let i = 2; i < lines.length; i++) {
			const rowCells = this.parseRow(lines[i]);
			if (rowCells.length === 0) continue;

			const tr = document.createElement('tr');
			for (let j = 0; j < headerRow.length; j++) {
				const td = document.createElement('td');
				td.textContent = (rowCells[j] || '').trim();
				tr.appendChild(td);
			}
			tbody.appendChild(tr);
		}
		table.appendChild(tbody);

		container.appendChild(table);
		return container;
	}

	parseRow(line: string): string[] {
		// Remove leading/trailing pipes and split by |
		const trimmed = line.trim();
		if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
			return trimmed.split('|').map(s => s.trim()).filter(s => s);
		}
		return trimmed.slice(1, -1).split('|').map(s => s.trim());
	}

	eq(other: TableWidget) {
		return other.tableMarkdown === this.tableMarkdown && other.isDark === this.isDark;
	}
}

// Create the live markdown decorator
const createLiveDecorator = (isDark: boolean, basePath: string | null = null) =>
	ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.buildDecorations(view);
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged || update.selectionSet) {
					this.decorations = this.buildDecorations(update.view);
				}
			}

			buildDecorations(view: EditorView): DecorationSet {
				const decorations: { from: number; to: number; decoration: Decoration }[] = [];
				const selection = view.state.selection.main;
				const selectionStartLine = view.state.doc.lineAt(selection.from).number;
				const selectionEndLine = view.state.doc.lineAt(selection.to).number;

				// Function to check if a line should show raw markdown
				// Shows raw on: selected lines, and adjacent lines (+1/-1) when multiline selection
				const shouldShowRaw = (lineNum: number): boolean => {
					// Always show raw on selected lines
					if (lineNum >= selectionStartLine && lineNum <= selectionEndLine) {
						return true;
					}
					// If multiline selection, also show raw on adjacent lines
					if (selectionStartLine !== selectionEndLine) {
						if (lineNum === selectionStartLine - 1 || lineNum === selectionEndLine + 1) {
							return true;
						}
					}
					return false;
				};

				for (const { from, to } of view.visibleRanges) {
					syntaxTree(view.state).iterate({
						from,
						to,
						enter(node) {
							const lineNum = view.state.doc.lineAt(node.from).number;
							const isActiveLine = shouldShowRaw(lineNum);

							// Headings - hide # marks on inactive lines, style content
							if (node.name.startsWith('ATXHeading')) {
								const level = parseInt(node.name.replace('ATXHeading', '')) || 1;
								const line = view.state.doc.lineAt(node.from);
								const text = line.text;
								const hashMatch = text.match(/^(#{1,6})\s/);

								if (hashMatch && !isActiveLine) {
									// Hide the hash marks
									decorations.push({
										from: node.from,
										to: node.from + hashMatch[0].length,
										decoration: hiddenDecoration
									});
								}
								// Style the heading content
								decorations.push({
									from: node.from,
									to: node.to,
									decoration: createHeadingDecoration(level, isDark)
								});
							}

							// Bold - hide ** marks on inactive lines
							if (node.name === 'StrongEmphasis') {
								if (!isActiveLine) {
									decorations.push({ from: node.from, to: node.from + 2, decoration: hiddenDecoration });
									decorations.push({ from: node.to - 2, to: node.to, decoration: hiddenDecoration });
								}
								decorations.push({ from: node.from, to: node.to, decoration: createBoldDecoration() });
							}

							// Italic - hide * marks on inactive lines
							if (node.name === 'Emphasis') {
								if (!isActiveLine) {
									decorations.push({ from: node.from, to: node.from + 1, decoration: hiddenDecoration });
									decorations.push({ from: node.to - 1, to: node.to, decoration: hiddenDecoration });
								}
								decorations.push({ from: node.from, to: node.to, decoration: createItalicDecoration() });
							}

							// Strikethrough - hide ~~ marks on inactive lines
							if (node.name === 'Strikethrough') {
								if (!isActiveLine) {
									decorations.push({ from: node.from, to: node.from + 2, decoration: hiddenDecoration });
									decorations.push({ from: node.to - 2, to: node.to, decoration: hiddenDecoration });
								}
								decorations.push({ from: node.from, to: node.to, decoration: createStrikethroughDecoration() });
							}

							// Inline code - hide ` marks on inactive lines
							if (node.name === 'InlineCode') {
								if (!isActiveLine) {
									decorations.push({ from: node.from, to: node.from + 1, decoration: hiddenDecoration });
									decorations.push({ from: node.to - 1, to: node.to, decoration: hiddenDecoration });
								}
								decorations.push({ from: node.from, to: node.to, decoration: createCodeDecoration(isDark) });
							}

							// Links - hide []() syntax on inactive lines, show just text
							if (node.name === 'Link') {
								const text = view.state.sliceDoc(node.from, node.to);
								const linkMatch = text.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
								if (linkMatch && !isActiveLine) {
									decorations.push({ from: node.from, to: node.from + 1, decoration: hiddenDecoration });
									const urlStart = node.from + 1 + linkMatch[1].length;
									decorations.push({ from: urlStart, to: node.to, decoration: hiddenDecoration });
								}
								decorations.push({ from: node.from, to: node.to, decoration: createLinkDecoration(isDark) });
							}

							// Task list markers
							if (node.name === 'TaskMarker') {
								const text = view.state.sliceDoc(node.from, node.to);
								const isChecked = text.includes('x') || text.includes('X');
								if (!isActiveLine) {
									decorations.push({
										from: node.from,
										to: node.to,
										decoration: Decoration.replace({
											widget: new CheckboxWidget(isChecked, isDark)
										})
									});
								}
							}

							// List markers (-, *, +) - replace with configured bullet
							if (node.name === 'ListMark') {
								const text = view.state.sliceDoc(node.from, node.to);
								// Only replace unordered list markers (-, *, +), not numbers
								if (!isActiveLine && /^[-*+]$/.test(text.trim())) {
									decorations.push({
										from: node.from,
										to: node.to,
										decoration: Decoration.replace({
											widget: new ListMarkerWidget(text, isDark)
										})
									});
								}
							}

							// Images - style the image syntax
							if (node.name === 'Image') {
								const text = view.state.sliceDoc(node.from, node.to);
								const imgMatch = text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
								if (imgMatch && !isActiveLine) {
									// Hide ![ and ](url)
									decorations.push({ from: node.from, to: node.from + 2, decoration: hiddenDecoration });
									const urlStart = node.from + 2 + imgMatch[1].length;
									decorations.push({ from: urlStart, to: node.to, decoration: hiddenDecoration });
								}
								decorations.push({ from: node.from, to: node.to, decoration: createLinkDecoration(isDark) });
							}
						}
					});
				}

				// Sort decorations by position - required by RangeSetBuilder
				decorations.sort((a, b) => a.from - b.from || a.to - b.to);

				// Build the decoration set
				const builder = new RangeSetBuilder<Decoration>();
				for (const { from, to, decoration } of decorations) {
					builder.add(from, to, decoration);
				}

				return builder.finish();
			}
		},
		{
			decorations: (v) => v.decorations
		}
	);

// StateField for block decorations (images and charts)
// Block decorations must be provided via StateField, not ViewPlugin
let blockWidgetCounter = 0;

const createBlockWidgetsField = (basePath: string | null, isDark: boolean) =>
	StateField.define<DecorationSet>({
		create(state) {
			return buildBlockDecorations(state, basePath, isDark);
		},
		update(decorations, tr) {
			if (tr.docChanged || tr.selection) {
				return buildBlockDecorations(tr.state, basePath, isDark);
			}
			return decorations;
		},
		provide: (field) => EditorView.decorations.from(field)
	});

function buildBlockDecorations(state: import('@codemirror/state').EditorState, basePath: string | null, isDark: boolean): DecorationSet {
	const decorations: { from: number; decoration: Decoration }[] = [];
	const selection = state.selection.main;
	const selectionStartLine = state.doc.lineAt(selection.from).number;
	const selectionEndLine = state.doc.lineAt(selection.to).number;
	const doc = state.doc.toString();

	// Function to check if a block should show rendered widget
	const shouldShowWidget = (startLine: number, endLine: number): boolean => {
		// Don't show widget if selection is on or adjacent to the block
		const isMultilineSelection = selectionStartLine !== selectionEndLine;

		// Check if any line of the block overlaps with selection or adjacent lines
		for (let line = startLine; line <= endLine; line++) {
			if (line >= selectionStartLine && line <= selectionEndLine) {
				return false; // Selection is on this line
			}
			if (isMultilineSelection) {
				if (line === selectionStartLine - 1 || line === selectionEndLine + 1) {
					return false; // Adjacent to selection
				}
			}
		}
		return true;
	};

	// Find image lines: ![alt](src)
	const imageRegex = /^!\[([^\]]*)\]\(([^)]+)\)$/gm;
	let match;
	while ((match = imageRegex.exec(doc)) !== null) {
		const lineNum = state.doc.lineAt(match.index).number;
		if (shouldShowWidget(lineNum, lineNum)) {
			const line = state.doc.lineAt(match.index);
			const [, alt, src] = match;
			decorations.push({
				from: line.to,
				decoration: Decoration.widget({
					widget: new ImageWidget(src, alt, basePath),
					block: true,
					side: 1
				})
			});
		}
	}

	// Find chart blocks
	const chartRegex = /```chart[ \t]*[\r\n]+([\s\S]*?)[\r\n][ \t]*```/g;

	while ((match = chartRegex.exec(doc)) !== null) {
		const startLine = state.doc.lineAt(match.index).number;
		const endPos = match.index + match[0].length - 1;
		const endLine = state.doc.lineAt(endPos).number;

		if (shouldShowWidget(startLine, endLine)) {
			const line = state.doc.lineAt(endPos);
			blockWidgetCounter++;
			const chartContent = match[1].trim();

			if (chartContent) {
				decorations.push({
					from: line.to,
					decoration: Decoration.widget({
						widget: new ChartWidget(chartContent, `live-chart-${blockWidgetCounter}-${Date.now()}`),
						block: true,
						side: 1
					})
				});
			}
		}
	}

	// Find mermaid blocks
	const mermaidRegex = /```mermaid[ \t]*[\r\n]+([\s\S]*?)[\r\n][ \t]*```/g;

	while ((match = mermaidRegex.exec(doc)) !== null) {
		const startLine = state.doc.lineAt(match.index).number;
		const endPos = match.index + match[0].length - 1;
		const endLine = state.doc.lineAt(endPos).number;

		if (shouldShowWidget(startLine, endLine)) {
			const line = state.doc.lineAt(endPos);
			blockWidgetCounter++;
			const mermaidContent = match[1].trim();

			if (mermaidContent) {
				decorations.push({
					from: line.to,
					decoration: Decoration.widget({
						widget: new MermaidWidget(mermaidContent, `live-mermaid-${blockWidgetCounter}-${Date.now()}`),
						block: true,
						side: 1
					})
				});
			}
		}
	}

	// Find markdown tables
	// Table pattern: lines starting with | that have at least one separator row (|---|---|)
	const tableRegex = /^(\|[^\n]+\|\r?\n\|[-:\s|]+\|\r?\n(?:\|[^\n]+\|\r?\n?)*)/gm;

	while ((match = tableRegex.exec(doc)) !== null) {
		const tableContent = match[1].trim();
		const startPos = match.index;
		const endPos = match.index + match[0].length - 1;
		const startLine = state.doc.lineAt(startPos).number;
		const endLine = state.doc.lineAt(endPos).number;

		if (shouldShowWidget(startLine, endLine)) {
			// Hide the table markdown and show rendered table
			const lastLineOfTable = state.doc.lineAt(endPos);
			decorations.push({
				from: lastLineOfTable.to,
				decoration: Decoration.widget({
					widget: new TableWidget(tableContent, isDark),
					block: true,
					side: 1
				})
			});
		}
	}

	// Sort by position
	decorations.sort((a, b) => a.from - b.from);

	// Build decoration set
	const builder = new RangeSetBuilder<Decoration>();
	for (const { from, decoration } of decorations) {
		builder.add(from, from, decoration);
	}

	return builder.finish();
}

const createLiveTheme = (fontSize: number) =>
	EditorView.theme({
		'&': {
			backgroundColor: '#ffffff',
			color: '#1e293b',
			height: '100%'
		},
		'.cm-scroller': {
			display: 'flex',
			justifyContent: 'center'
		},
		'.cm-content': {
			fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
			fontSize: `${fontSize}px`,
			padding: '48px 24px',
			lineHeight: '1.8',
			caretColor: '#06b6d4',
			maxWidth: '800px',
			width: '100%'
		},
		'.cm-cursor': {
			borderLeftColor: '#06b6d4'
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
			paddingLeft: '0',
			paddingRight: '0'
		}
	});

const createLiveDarkTheme = (fontSize: number) =>
	EditorView.theme(
		{
			'&': {
				backgroundColor: '#0f172a',
				color: '#e2e8f0',
				height: '100%'
			},
			'.cm-scroller': {
				display: 'flex',
				justifyContent: 'center'
			},
			'.cm-content': {
				fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
				fontSize: `${fontSize}px`,
				padding: '48px 24px',
				lineHeight: '1.8',
				caretColor: '#06b6d4',
				maxWidth: '800px',
				width: '100%'
			},
			'.cm-cursor': {
				borderLeftColor: '#06b6d4'
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
				paddingLeft: '0',
				paddingRight: '0'
			}
		},
		{ dark: true }
	);

export function getLiveThemeExtension(isDark: boolean, fontSize: number): Extension {
	return isDark ? [oneDark, createLiveDarkTheme(fontSize)] : [syntaxHighlighting(defaultHighlightStyle, { fallback: true }), createLiveTheme(fontSize)];
}

export function getLiveDecoratorExtension(isDark: boolean, basePath: string | null = null): Extension {
	return createLiveDecorator(isDark, basePath);
}

export function getLiveSpellCheckExtension(spellCheck: boolean, lang: string = 'pt-BR'): Extension {
	return EditorView.contentAttributes.of({
		spellcheck: spellCheck ? 'true' : 'false',
		autocorrect: 'on',
		autocapitalize: 'sentences',
		lang
	});
}

export function createLiveEditorExtensions(isDark: boolean, onChange: (content: string) => void, onSave?: () => void, fontSize: number = 15, basePath: string | null = null, spellCheck: boolean = true, spellCheckLang: string = 'pt-BR'): Extension[] {
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
		// Core extensions - no line numbers for clean live preview
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

		// Markdown
		markdown({ base: markdownLanguage, codeLanguages: languages }),

		// Live preview decorator (inline decorations)
		liveDecoratorCompartment.of(createLiveDecorator(isDark, basePath)),

		// Block widgets (images, charts, tables)
		createBlockWidgetsField(basePath, isDark),

		// Theme
		liveThemeCompartment.of(getLiveThemeExtension(isDark, fontSize)),

		// Change listener
		EditorView.updateListener.of(
			(() => {
				let debounceTimer: ReturnType<typeof setTimeout> | null = null;
				return (update: ViewUpdate) => {
					if (update.docChanged) {
						if (debounceTimer) clearTimeout(debounceTimer);
						debounceTimer = setTimeout(() => {
							onChange(update.state.doc.toString());
						}, 100);
					}
				};
			})()
		),
		EditorView.lineWrapping,

		// Spell check using browser's native spell check (via compartment for dynamic updates)
		// Note: spellcheck in Tauri WebView depends on system settings
		liveSpellCheckCompartment.of(getLiveSpellCheckExtension(spellCheck, spellCheckLang)),

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
					// No selection - create link with URL as title (or extract title from URL)
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
