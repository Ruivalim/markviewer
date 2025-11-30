import type { FileBuffer, FileTreeNode } from '$lib/types';
import { fileService } from '$lib/services/file-service';
import { gitService, type GitFileStatus } from '$lib/services/git-service';
import { recentStore } from './recent.svelte';
import { settingsStore } from './settings.svelte';
import { toastStore } from './toast.svelte';

class FilesStore {
	buffers = $state<FileBuffer[]>([]);
	activeBufferId = $state<string | null>(null);
	openFolder = $state<string | null>(null);
	fileTree = $state<FileTreeNode[]>([]);
	fileChangedExternally = $state<string | null>(null);
	gitStatus = $state<Map<string, GitFileStatus>>(new Map());
	isGitRepo = $state(false);
	isLoadingFolder = $state(false);

	private autoSaveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
	private fileWatchers: Map<string, () => void> = new Map();
	// Map for O(1) buffer lookup by id
	private buffersMap: Map<string, FileBuffer> = new Map();

	get activeBuffer(): FileBuffer | null {
		if (!this.activeBufferId) return null;
		return this.buffersMap.get(this.activeBufferId) ?? null;
	}

	get hasUnsavedChanges(): boolean {
		return this.buffers.some((b) => b.isDirty);
	}

	async openFile(path: string) {
		const existing = this.buffers.find((b) => b.path === path);
		if (existing) {
			this.activeBufferId = existing.id;
			return;
		}

		try {
			const content = await fileService.readFile(path);
			const id = crypto.randomUUID();
			const buffer: FileBuffer = {
				id,
				path,
				name: fileService.getFileName(path),
				content,
				originalContent: content,
				isDirty: false
			};
			this.buffers.push(buffer);
			this.buffersMap.set(id, buffer);
			this.activeBufferId = id;
			recentStore.addRecent(path, fileService.getFileName(path));

			// Start watching the file
			this.watchFile(id, path);
		} catch (error) {
			console.error('Failed to open file:', error);
		}
	}

	private async watchFile(_bufferId: string, _path: string) {
		// File watching is temporarily disabled - Tauri fs:watch command not available
		// TODO: Re-enable when fs plugin is properly configured
		// try {
		// 	const unwatch = await fileService.watchFile(path, (event) => {
		// 		const isModify =
		// 			typeof event.type === 'object' &&
		// 			event.type !== null &&
		// 			'modify' in event.type;
		//
		// 		if (isModify) {
		// 			const buffer = this.buffers.find((b) => b.id === bufferId);
		// 			if (buffer && !buffer.isDirty) {
		// 				this.reloadBuffer(bufferId);
		// 			} else if (buffer && buffer.isDirty) {
		// 				this.fileChangedExternally = bufferId;
		// 			}
		// 		}
		// 	});
		// 	this.fileWatchers.set(bufferId, unwatch);
		// } catch (error) {
		// 	console.error('Failed to watch file:', error);
		// }
	}

	private unwatchFile(bufferId: string) {
		const unwatch = this.fileWatchers.get(bufferId);
		if (unwatch) {
			unwatch();
			this.fileWatchers.delete(bufferId);
		}
	}

	async reloadBuffer(id: string) {
		const buffer = this.buffers.find((b) => b.id === id);
		if (!buffer?.path) return;

		try {
			const content = await fileService.readFile(buffer.path);
			buffer.content = content;
			buffer.originalContent = content;
			buffer.isDirty = false;
		} catch (error) {
			console.error('Failed to reload file:', error);
		}
	}

	dismissExternalChange() {
		this.fileChangedExternally = null;
	}

	async openFileDialog() {
		const path = await fileService.openFileDialog();
		if (path) {
			await this.openFile(path);
		}
	}

	async openFolderDialog() {
		const path = await fileService.openFolderDialog();
		if (path) {
			await this.openFolderPath(path);
		}
	}

	async openFolderPath(path: string) {
		this.isLoadingFolder = true;
		try {
			this.openFolder = path;
			this.fileTree = await fileService.readDirectory(path);

			// Add to recent folders
			await recentStore.addRecentFolder(path);

			// Open sidebar if closed
			if (!settingsStore.sidebarVisible) {
				settingsStore.toggleSidebar();
			}

			// Check if it's a git repo and get status
			this.isGitRepo = await gitService.isGitRepo(path);
			if (this.isGitRepo) {
				await this.refreshGitStatus();
			}

			const folderName = path.split('/').pop() || path;
			toastStore.success(`Pasta "${folderName}" aberta`);
		} catch (error) {
			console.error('Failed to open folder:', error);
			toastStore.error('Erro ao abrir pasta');
		} finally {
			this.isLoadingFolder = false;
		}
	}

	async refreshGitStatus() {
		if (!this.openFolder || !this.isGitRepo) return;
		this.gitStatus = await gitService.getFilesStatus(this.openFolder);
	}

	getFileGitStatus(path: string): GitFileStatus {
		return this.gitStatus.get(path) ?? null;
	}

	async toggleFolderExpanded(node: FileTreeNode) {
		if (!node.isDirectory) return;

		node.isExpanded = !node.isExpanded;
		if (node.isExpanded && (!node.children || node.children.length === 0)) {
			node.children = await fileService.loadDirectoryChildren(node.path);
		}
	}

	closeFolder() {
		this.openFolder = null;
		this.fileTree = [];
		this.isGitRepo = false;
		this.gitStatus = new Map();
	}

	createNew() {
		const id = crypto.randomUUID();
		const buffer: FileBuffer = {
			id,
			path: null,
			name: 'Untitled.md',
			content: '',
			originalContent: '',
			isDirty: false
		};
		this.buffers.push(buffer);
		this.buffersMap.set(id, buffer);
		this.activeBufferId = id;
	}

	updateContent(id: string, content: string) {
		const index = this.buffers.findIndex((b) => b.id === id);
		if (index !== -1) {
			const buffer = this.buffers[index];
			const isDirty = content !== buffer.originalContent;

			// Update by creating a new object to ensure reactivity
			this.buffers[index] = {
				...buffer,
				content,
				isDirty
			};
			// Also update the map reference
			this.buffersMap.set(id, this.buffers[index]);

			// Schedule auto-save if enabled and file has a path
			if (settingsStore.autoSave && buffer.path && isDirty) {
				this.scheduleAutoSave(id);
			}
		}
	}

	private scheduleAutoSave(id: string) {
		// Clear existing timer for this buffer
		const existingTimer = this.autoSaveTimers.get(id);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Schedule new save
		const timer = setTimeout(() => {
			this.saveBuffer(id);
			this.autoSaveTimers.delete(id);
		}, settingsStore.autoSaveDelay);

		this.autoSaveTimers.set(id, timer);
	}

	cancelAutoSave(id: string) {
		const timer = this.autoSaveTimers.get(id);
		if (timer) {
			clearTimeout(timer);
			this.autoSaveTimers.delete(id);
		}
	}

	async saveBuffer(id: string) {
		const buffer = this.buffersMap.get(id);
		if (!buffer) return;

		try {
			let path = buffer.path;
			if (!path) {
				path = await fileService.saveFileDialog(buffer.name);
				if (!path) return;
				buffer.path = path;
				buffer.name = fileService.getFileName(path);
			}

			await fileService.saveFile(path, buffer.content);
			buffer.originalContent = buffer.content;
			buffer.isDirty = false;
			recentStore.addRecent(path, buffer.name);
			toastStore.success(`"${buffer.name}" salvo`);
		} catch (error) {
			console.error('Failed to save file:', error);
			toastStore.error('Erro ao salvar arquivo');
		}
	}

	async saveActiveBuffer() {
		if (this.activeBufferId) {
			await this.saveBuffer(this.activeBufferId);
		}
	}

	async saveBufferAs(id: string) {
		const buffer = this.buffersMap.get(id);
		if (!buffer) return;

		try {
			const path = await fileService.saveFileDialog(buffer.name);
			if (!path) return;

			buffer.path = path;
			buffer.name = fileService.getFileName(path);
			await fileService.saveFile(path, buffer.content);
			buffer.originalContent = buffer.content;
			buffer.isDirty = false;
			recentStore.addRecent(path, buffer.name);
			toastStore.success(`"${buffer.name}" salvo`);
		} catch (error) {
			console.error('Failed to save file:', error);
			toastStore.error('Erro ao salvar arquivo');
		}
	}

	closeBuffer(id: string) {
		const index = this.buffers.findIndex((b) => b.id === id);
		if (index !== -1) {
			// Stop watching the file
			this.unwatchFile(id);
			// Cancel any pending auto-save
			this.cancelAutoSave(id);
			// Clear external change notification if this buffer
			if (this.fileChangedExternally === id) {
				this.fileChangedExternally = null;
			}

			this.buffers.splice(index, 1);
			this.buffersMap.delete(id);
			if (this.activeBufferId === id) {
				this.activeBufferId = this.buffers[Math.max(0, index - 1)]?.id ?? null;
			}
		}
	}

	setActiveBuffer(id: string) {
		this.activeBufferId = id;
	}

	reorderBuffers(fromIndex: number, toIndex: number) {
		if (fromIndex === toIndex) return;
		const [buffer] = this.buffers.splice(fromIndex, 1);
		this.buffers.splice(toIndex, 0, buffer);
	}
}

export const filesStore = new FilesStore();
