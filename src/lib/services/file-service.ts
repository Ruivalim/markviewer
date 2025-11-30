import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, readDir, watch, exists, type WatchEvent } from '@tauri-apps/plugin-fs';
import type { FileTreeNode } from '$lib/types';

type WatchCallback = (event: WatchEvent) => void;
type UnwatchFn = () => void;

export const fileService = {
	async openFileDialog(): Promise<string | null> {
		const selected = await open({
			multiple: false,
			filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
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

			if (entry.isDirectory || this.isMarkdownFile(entry.name)) {
				nodes.push(node);
			}
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
