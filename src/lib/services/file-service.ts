import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, readDir, watch, exists, type WatchEvent } from '@tauri-apps/plugin-fs';
import type { FileTreeNode, CodeLanguage } from '$lib/types';

type WatchCallback = (event: WatchEvent) => void;
type UnwatchFn = () => void;

// Extension to language mapping
const CODE_EXTENSIONS: Record<string, CodeLanguage> = {
	// JavaScript/TypeScript
	'.js': 'javascript',
	'.mjs': 'javascript',
	'.cjs': 'javascript',
	'.ts': 'typescript',
	'.mts': 'typescript',
	'.cts': 'typescript',
	'.jsx': 'jsx',
	'.tsx': 'tsx',
	// Web
	'.html': 'html',
	'.htm': 'html',
	'.css': 'css',
	'.scss': 'scss',
	'.sass': 'scss',
	'.svelte': 'svelte',
	'.vue': 'vue',
	// Data
	'.json': 'json',
	'.yaml': 'yaml',
	'.yml': 'yaml',
	'.toml': 'toml',
	// Systems
	'.rs': 'rust',
	'.go': 'go',
	'.c': 'c',
	'.h': 'c',
	'.cpp': 'cpp',
	'.cc': 'cpp',
	'.cxx': 'cpp',
	'.hpp': 'cpp',
	'.cs': 'csharp',
	// Scripting
	'.py': 'python',
	'.rb': 'ruby',
	'.php': 'php',
	'.sh': 'bash',
	'.bash': 'bash',
	'.zsh': 'bash',
	'.fish': 'shell',
	// JVM
	'.java': 'java',
	'.kt': 'kotlin',
	'.kts': 'kotlin',
	// Mobile
	'.swift': 'swift',
	// Database/Query
	'.sql': 'sql',
	'.graphql': 'graphql',
	'.gql': 'graphql',
	// Config
	'.dockerfile': 'dockerfile',
	'.makefile': 'makefile',
	'.mk': 'makefile'
};

// Config files that should be editable (not read-only)
const EDITABLE_CONFIG_EXTENSIONS = ['.json', '.yaml', '.yml', '.toml'];

// All supported code extensions for file dialog
const ALL_CODE_EXTENSIONS = Object.keys(CODE_EXTENSIONS).map(ext => ext.slice(1));

export const fileService = {
	async openFileDialog(): Promise<string | null> {
		const selected = await open({
			multiple: false,
			filters: [
				{ name: 'All Supported', extensions: ['md', 'markdown', 'txt', 'text', 'log', ...ALL_CODE_EXTENSIONS] },
				{ name: 'Markdown', extensions: ['md', 'markdown'] },
				{ name: 'Code', extensions: ALL_CODE_EXTENSIONS },
				{ name: 'Text', extensions: ['txt', 'text', 'log'] }
			]
		});
		return selected as string | null;
	},

	async openFolderDialog(): Promise<string | null> {
		const selected = await open({
			directory: true,
			multiple: false
		});
		return selected as string | null;
	},

	async readFile(path: string): Promise<string> {
		return await readTextFile(path);
	},

	async saveFile(path: string, content: string): Promise<void> {
		await writeTextFile(path, content);
	},

	async saveFileDialog(defaultPath?: string): Promise<string | null> {
		const path = await save({
			defaultPath,
			filters: [{ name: 'Markdown', extensions: ['md'] }]
		});
		return path;
	},

	async readDirectory(path: string): Promise<FileTreeNode[]> {
		const entries = await readDir(path);
		const nodes: FileTreeNode[] = [];

		for (const entry of entries) {
			if (entry.name.startsWith('.')) continue;

			const fullPath = `${path}/${entry.name}`;
			const node: FileTreeNode = {
				name: entry.name,
				path: fullPath,
				isDirectory: entry.isDirectory,
				isExpanded: false
			};

			if (entry.isDirectory) {
				node.children = [];
			}

			// Show all files and directories
			nodes.push(node);
		}

		return nodes.sort((a, b) => {
			if (a.isDirectory && !b.isDirectory) return -1;
			if (!a.isDirectory && b.isDirectory) return 1;
			return a.name.localeCompare(b.name);
		});
	},

	async loadDirectoryChildren(path: string): Promise<FileTreeNode[]> {
		return this.readDirectory(path);
	},

	isMarkdownFile(filename: string): boolean {
		const lower = filename.toLowerCase();
		return lower.endsWith('.md') || lower.endsWith('.markdown');
	},

	isTextFile(filename: string): boolean {
		const lower = filename.toLowerCase();
		return lower.endsWith('.txt') || lower.endsWith('.text');
	},

	isLogFile(filename: string): boolean {
		const lower = filename.toLowerCase();
		return lower.endsWith('.log');
	},

	isCodeFile(filename: string): boolean {
		const lower = filename.toLowerCase();
		const ext = lower.substring(lower.lastIndexOf('.'));
		return ext in CODE_EXTENSIONS;
	},

	isSupportedFile(filename: string): boolean {
		return this.isMarkdownFile(filename) || this.isTextFile(filename) || this.isLogFile(filename) || this.isCodeFile(filename);
	},

	getFileType(filename: string): 'markdown' | 'text' | 'code' | 'log' {
		if (this.isMarkdownFile(filename)) return 'markdown';
		if (this.isLogFile(filename)) return 'log';
		if (this.isCodeFile(filename)) return 'code';
		return 'text';
	},

	getCodeLanguage(filename: string): CodeLanguage {
		const lower = filename.toLowerCase();
		const ext = lower.substring(lower.lastIndexOf('.'));
		return CODE_EXTENSIONS[ext] ?? 'plaintext';
	},

	isEditableConfigFile(filename: string): boolean {
		const lower = filename.toLowerCase();
		const ext = lower.substring(lower.lastIndexOf('.'));
		return EDITABLE_CONFIG_EXTENSIONS.includes(ext);
	},

	getFileName(path: string): string {
		return path.split('/').pop() ?? 'Untitled';
	},

	async watchFile(path: string, callback: WatchCallback): Promise<UnwatchFn> {
		return await watch(path, callback, { recursive: false });
	},

	async fileExists(path: string): Promise<boolean> {
		try {
			return await exists(path);
		} catch {
			return false;
		}
	}
};
