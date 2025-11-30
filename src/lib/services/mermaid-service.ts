import mermaid from 'mermaid';

type MermaidTheme = 'default' | 'dark' | 'forest' | 'neutral';

class MermaidService {
	private initialized = false;
	private currentTheme: MermaidTheme = 'default';

	/**
	 * Initialize mermaid with the given theme
	 */
	init(theme: 'light' | 'dark') {
		this.currentTheme = theme === 'dark' ? 'dark' : 'default';

		mermaid.initialize({
			startOnLoad: false,
			theme: this.currentTheme,
			securityLevel: 'loose',
			flowchart: {
				useMaxWidth: true,
				htmlLabels: true,
				curve: 'basis'
			},
			sequence: {
				useMaxWidth: true,
				diagramMarginX: 50,
				diagramMarginY: 10,
				actorMargin: 50,
				width: 150,
				height: 65,
				boxMargin: 10,
				boxTextMargin: 5,
				noteMargin: 10,
				messageMargin: 35
			},
			gantt: {
				useMaxWidth: true,
				barHeight: 20,
				barGap: 4,
				topPadding: 50,
				leftPadding: 75,
				gridLineStartPadding: 35,
				fontSize: 11
			},
			er: {
				useMaxWidth: true,
				entityPadding: 15,
				fontSize: 12
			},
			pie: {
				useMaxWidth: true
			}
		});

		this.initialized = true;
	}

	/**
	 * Update the theme for mermaid diagrams
	 */
	updateTheme(theme: 'light' | 'dark') {
		const newTheme: MermaidTheme = theme === 'dark' ? 'dark' : 'default';

		if (newTheme !== this.currentTheme) {
			this.currentTheme = newTheme;
			mermaid.initialize({
				theme: this.currentTheme
			});
		}
	}

	/**
	 * Render a mermaid diagram
	 * @param id Unique ID for the diagram
	 * @param definition The mermaid diagram definition
	 * @returns The rendered SVG string
	 */
	async render(id: string, definition: string): Promise<string> {
		if (!this.initialized) {
			this.init('light');
		}

		try {
			// Clean up the definition
			const cleanDefinition = definition.trim();

			// Generate a unique ID to avoid conflicts
			const uniqueId = `mermaid-${id}-${Date.now()}`;

			const { svg } = await mermaid.render(uniqueId, cleanDefinition);
			return svg;
		} catch (error) {
			console.error('Mermaid render error:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			return `<div class="diagram-error">
				<strong>Diagram Error</strong>
				<pre>${this.escapeHtml(errorMessage)}</pre>
			</div>`;
		}
	}

	/**
	 * Check if a mermaid definition is valid
	 */
	async validate(definition: string): Promise<{ valid: boolean; error?: string }> {
		try {
			await mermaid.parse(definition.trim());
			return { valid: true };
		} catch (error) {
			return {
				valid: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/**
	 * Escape HTML to prevent XSS in error messages
	 */
	private escapeHtml(text: string): string {
		return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
	}
}

export const mermaidService = new MermaidService();
