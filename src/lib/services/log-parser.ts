/**
 * Log parser service for rendering structured log files
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'fatal' | 'unknown';

export interface LogMetadata {
	key: string;
	value: string;
	isLast: boolean;
}

export interface ParsedLogEntry {
	level: LogLevel;
	timestamp: string | null;
	module: string | null;
	message: string;
	metadata: LogMetadata[];
	raw: string;
}

// Level icons mapping
const LEVEL_ICONS: Record<LogLevel, string> = {
	info: 'ℹ️',
	warn: '⚠️',
	error: '❌',
	debug: '🔧',
	trace: '🔍',
	fatal: '💀',
	unknown: '📋'
};

// Regex patterns for detecting log entries
const LOG_PATTERNS = {
	// Pattern: emoji timestamp MODULE LEVEL - more flexible with spaces and emoji variants
	structured: /^(.+?)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\w+)\s+(INFO|WARN|WARNING|ERROR|DEBUG|TRACE|FATAL)\s*$/,

	// Pattern: [LEVEL] timestamp message or timestamp [LEVEL] message
	bracketed: /^\[?(INFO|WARN|WARNING|ERROR|DEBUG|TRACE|FATAL)\]?\s*[-:]?\s*(\d{4}[-/]\d{2}[-/]\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?/i,

	// Pattern: timestamp [LEVEL] message
	timestampFirst: /^(\d{4}[-/]\d{2}[-/]\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s*\[?(INFO|WARN|WARNING|ERROR|DEBUG|TRACE|FATAL)\]?/i,

	// Metadata line pattern: ├─ key: value or └─ key: value
	metadata: /^[\s]*[├└]─\s*(\w+):\s*(.+)$/,

	// Simple continuation (indented content)
	continuation: /^[\s]{2,}(.+)$/
};

function detectLevel(levelStr: string): LogLevel {
	const upper = levelStr.toUpperCase();
	if (upper === 'INFO') return 'info';
	if (upper === 'WARN' || upper === 'WARNING') return 'warn';
	if (upper === 'ERROR' || upper === 'ERR') return 'error';
	if (upper === 'DEBUG') return 'debug';
	if (upper === 'TRACE') return 'trace';
	if (upper === 'FATAL') return 'fatal';
	return 'unknown';
}

function detectLevelFromEmoji(emoji: string): LogLevel {
	// Normalize - remove variation selectors and trim
	const normalized = emoji.trim();
	if (normalized.includes('ℹ')) return 'info';
	if (normalized.includes('⚠')) return 'warn';
	if (normalized.includes('❌')) return 'error';
	if (normalized.includes('🔧')) return 'debug';
	if (normalized.includes('🔍')) return 'trace';
	if (normalized.includes('💀')) return 'fatal';
	return 'unknown';
}

export function parseLogContent(content: string): ParsedLogEntry[] {
	const lines = content.split('\n');
	const entries: ParsedLogEntry[] = [];
	let currentEntry: ParsedLogEntry | null = null;
	let messageLines: string[] = [];

	function finalizeEntry() {
		if (currentEntry) {
			if (messageLines.length > 0) {
				currentEntry.message = messageLines.join('\n').trim();
			}
			// Mark last metadata item
			if (currentEntry.metadata.length > 0) {
				currentEntry.metadata[currentEntry.metadata.length - 1].isLast = true;
			}
			entries.push(currentEntry);
		}
		currentEntry = null;
		messageLines = [];
	}

	for (const line of lines) {
		// Check for structured log with emoji (format: emoji timestamp MODULE LEVEL)
		const structuredMatch = line.match(LOG_PATTERNS.structured);
		if (structuredMatch) {
			finalizeEntry();
			// Use the level text (INFO, WARN, etc) as primary source, emoji as fallback
			const levelFromText = detectLevel(structuredMatch[4]);
			currentEntry = {
				level: levelFromText !== 'unknown' ? levelFromText : detectLevelFromEmoji(structuredMatch[1]),
				timestamp: structuredMatch[2],
				module: structuredMatch[3],
				message: '',
				metadata: [],
				raw: line
			};
			continue;
		}

		// Check for metadata line
		const metadataMatch = line.match(LOG_PATTERNS.metadata);
		if (metadataMatch && currentEntry) {
			currentEntry.metadata.push({
				key: metadataMatch[1],
				value: metadataMatch[2],
				isLast: false
			});
			continue;
		}

		// Check for continuation/message line
		const continuationMatch = line.match(LOG_PATTERNS.continuation);
		if (continuationMatch && currentEntry && currentEntry.metadata.length === 0) {
			messageLines.push(continuationMatch[1].trim());
			continue;
		}

		// Check for timestamp-first pattern
		const timestampFirstMatch = line.match(LOG_PATTERNS.timestampFirst);
		if (timestampFirstMatch) {
			finalizeEntry();
			const restOfLine = line.substring(timestampFirstMatch[0].length).trim();
			currentEntry = {
				level: detectLevel(timestampFirstMatch[2]),
				timestamp: timestampFirstMatch[1],
				module: null,
				message: restOfLine,
				metadata: [],
				raw: line
			};
			continue;
		}

		// Check for bracketed pattern
		const bracketedMatch = line.match(LOG_PATTERNS.bracketed);
		if (bracketedMatch) {
			finalizeEntry();
			const restOfLine = line.substring(bracketedMatch[0].length).trim();
			currentEntry = {
				level: detectLevel(bracketedMatch[1]),
				timestamp: bracketedMatch[2] || null,
				module: null,
				message: restOfLine,
				metadata: [],
				raw: line
			};
			continue;
		}

		// Plain line - if we have a current entry, treat as continuation
		if (currentEntry && line.trim()) {
			if (currentEntry.metadata.length === 0) {
				messageLines.push(line.trim());
			}
			continue;
		}

		// Standalone line without recognized pattern
		if (line.trim()) {
			finalizeEntry();
			entries.push({
				level: 'unknown',
				timestamp: null,
				module: null,
				message: line,
				metadata: [],
				raw: line
			});
		}
	}

	// Don't forget the last entry
	finalizeEntry();

	return entries;
}

export function renderLogToHtml(entries: ParsedLogEntry[]): string {
	if (entries.length === 0) {
		return '<div class="log-viewer"><div class="log-empty">No log entries found</div></div>';
	}

	const entryHtml = entries.map(entry => {
		const icon = LEVEL_ICONS[entry.level];
		const levelClass = `log-level-${entry.level}`;

		let html = `<div class="log-entry ${levelClass}">`;

		// Header line with icon, timestamp, module, level
		html += `<div class="log-header">`;
		html += `<span class="log-icon">${icon}</span>`;

		if (entry.timestamp) {
			html += `<span class="log-timestamp">${escapeHtml(entry.timestamp)}</span>`;
		}

		if (entry.module) {
			html += `<span class="log-module">${escapeHtml(entry.module)}</span>`;
		}

		html += `<span class="log-level-badge">${entry.level.toUpperCase()}</span>`;
		html += `</div>`;

		// Message
		if (entry.message) {
			html += `<div class="log-message">${escapeHtml(entry.message)}</div>`;
		}

		// Metadata tree
		if (entry.metadata.length > 0) {
			html += `<div class="log-metadata">`;
			for (const meta of entry.metadata) {
				const prefix = meta.isLast ? '└─' : '├─';
				html += `<div class="log-meta-item">`;
				html += `<span class="log-meta-prefix">${prefix}</span>`;
				html += `<span class="log-meta-key">${escapeHtml(meta.key)}:</span>`;
				html += `<span class="log-meta-value">${escapeHtml(meta.value)}</span>`;
				html += `</div>`;
			}
			html += `</div>`;
		}

		html += `</div>`;
		return html;
	}).join('');

	return `<div class="log-viewer">${entryHtml}</div>`;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export const logParser = {
	parse: parseLogContent,
	render: renderLogToHtml,
	parseAndRender(content: string): string {
		const entries = parseLogContent(content);
		return renderLogToHtml(entries);
	}
};
