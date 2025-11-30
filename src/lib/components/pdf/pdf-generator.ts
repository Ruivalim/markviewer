import type { PdfExportOptions } from '$lib/types';
import { markdownService } from '$lib/services/markdown-service';

const pageSizes: Record<string, [number, number]> = {
	A4: [210, 297],
	Letter: [215.9, 279.4],
	Legal: [215.9, 355.6]
};

const marginValues: Record<string, number> = {
	normal: 25.4,
	narrow: 12.7,
	wide: 50.8
};

function getStyles(theme: 'light' | 'dark'): string {
	const isDark = theme === 'dark';

	return `
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: ${isDark ? '#e2e8f0' : '#334155'};
      background: ${isDark ? '#0f172a' : '#ffffff'};
      margin: 0;
      padding: 0;
    }
    h1, h2, h3, h4, h5, h6 {
      color: ${isDark ? '#f1f5f9' : '#0f172a'};
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    h1 { font-size: 2em; margin-top: 0; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1.1em; }
    p { margin: 1em 0; }
    a { color: #06b6d4; text-decoration: underline; }
    code {
      font-family: ui-monospace, monospace;
      font-size: 0.9em;
      background: ${isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 100, 100, 0.1)'};
      padding: 2px 6px;
      border-radius: 4px;
    }
    pre {
      background: ${isDark ? '#1e293b' : '#f1f5f9'};
      padding: 1em;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.9em;
    }
    pre code {
      background: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 3px solid #06b6d4;
      margin: 1em 0;
      padding-left: 1em;
      font-style: italic;
      color: ${isDark ? '#94a3b8' : '#64748b'};
    }
    ul, ol { padding-left: 1.5em; margin: 1em 0; }
    li { margin: 0.3em 0; }
    hr {
      border: none;
      border-top: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
      margin: 2em 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid ${isDark ? '#475569' : '#e2e8f0'};
      padding: 0.5em 1em;
      text-align: left;
    }
    th {
      background: ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 100, 100, 0.05)'};
      font-weight: 600;
    }
    img { max-width: 100%; height: auto; }
  `;
}

export async function generatePdf(markdown: string, options: PdfExportOptions): Promise<void> {
	const html = markdownService.render(markdown);
	const styles = getStyles(options.theme);
	const [width, _height] = pageSizes[options.pageSize];
	const margin = marginValues[options.margins];

	const container = document.createElement('div');
	container.innerHTML = `
    <style>${styles}</style>
    <div class="pdf-content">${html}</div>
  `;
	container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: ${width - margin * 2}mm;
    background: ${options.theme === 'dark' ? '#0f172a' : '#ffffff'};
    padding: ${margin}mm;
  `;
	document.body.appendChild(container);

	try {
		const html2pdf = (await import('html2pdf.js')).default;

		await html2pdf()
			.set({
				margin: margin,
				filename: 'document.pdf',
				image: { type: 'jpeg', quality: 0.98 },
				html2canvas: {
					scale: 2,
					useCORS: true,
					backgroundColor: options.theme === 'dark' ? '#0f172a' : '#ffffff'
				},
				jsPDF: {
					unit: 'mm',
					format: options.pageSize.toLowerCase(),
					orientation: 'portrait'
				}
			})
			.from(container)
			.save();
	} finally {
		document.body.removeChild(container);
	}
}
