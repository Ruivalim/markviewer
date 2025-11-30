export interface FileBuffer {
	id: string;
	path: string | null;
	name: string;
	content: string;
	originalContent: string;
	isDirty: boolean;
}

export interface FileTreeNode {
	name: string;
	path: string;
	isDirectory: boolean;
	children?: FileTreeNode[];
	isExpanded?: boolean;
}

export interface RecentFile {
	path: string;
	name: string;
	openedAt: number;
}

export interface RecentFolder {
	path: string;
	name: string;
	openedAt: number;
}

export interface AppSettings {
	theme: 'light' | 'dark';
	sidebarVisible: boolean;
	sidebarWidth: number;
	fontSize: number;
	autoSave: boolean;
	autoSaveDelay: number;
}

export type ViewMode = 'edit' | 'preview' | 'split' | 'live';

export interface PdfExportOptions {
	theme: 'light' | 'dark';
	pageSize: 'A4' | 'Letter' | 'Legal';
	margins: 'normal' | 'narrow' | 'wide';
}

// Style configuration types
export interface HeadingStyle {
	fontSize: string; // e.g., "2.25em"
	fontWeight: number; // e.g., 800
	lineHeight: number; // e.g., 1.2
	colorLight: string; // e.g., "#7c3aed"
	colorDark: string; // e.g., "#a78bfa"
}

export interface ListStyle {
	bulletChar: string; // e.g., "•", "◦", "▪", "-"
	numberStyle: 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman';
	colorLight: string;
	colorDark: string;
}

export interface StyleConfig {
	// Headings h1-h6
	headings: {
		h1: HeadingStyle;
		h2: HeadingStyle;
		h3: HeadingStyle;
		h4: HeadingStyle;
		h5: HeadingStyle;
		h6: HeadingStyle;
	};
	// Links
	link: {
		colorLight: string;
		colorDark: string;
		underline: boolean;
	};
	// Inline code
	inlineCode: {
		backgroundLight: string;
		backgroundDark: string;
		colorLight: string;
		colorDark: string;
		fontFamily: string;
	};
	// Blockquote
	blockquote: {
		borderColorLight: string;
		borderColorDark: string;
		borderWidth: number;
	};
	// Lists
	list: ListStyle;
	// Code blocks
	codeBlock: {
		backgroundLight: string;
		backgroundDark: string;
	};
}
