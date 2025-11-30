import { storeService } from '$lib/services/store-service';
import type { RecentFile, RecentFolder } from '$lib/types';

const MAX_RECENT_FILES = 10;
const MAX_RECENT_FOLDERS = 5;

class RecentStore {
	files = $state<RecentFile[]>([]);
	folders = $state<RecentFolder[]>([]);

	async init() {
		const storedFiles = await storeService.get<RecentFile[]>('recentFiles');
		if (storedFiles) {
			this.files = storedFiles;
		}

		const storedFolders = await storeService.get<RecentFolder[]>('recentFolders');
		if (storedFolders) {
			this.folders = storedFolders;
		}
	}

	async addRecentFile(path: string, name: string) {
		this.files = this.files.filter((f) => f.path !== path);

		this.files.unshift({
			path,
			name,
			openedAt: Date.now()
		});

		if (this.files.length > MAX_RECENT_FILES) {
			this.files = this.files.slice(0, MAX_RECENT_FILES);
		}

		await this.persistFiles();
	}

	// Alias for backwards compatibility
	async addRecent(path: string, name: string) {
		return this.addRecentFile(path, name);
	}

	async addRecentFolder(path: string) {
		this.folders = this.folders.filter((f) => f.path !== path);

		// Extract folder name from path
		const name = path.split('/').pop() || path;

		this.folders.unshift({
			path,
			name,
			openedAt: Date.now()
		});

		if (this.folders.length > MAX_RECENT_FOLDERS) {
			this.folders = this.folders.slice(0, MAX_RECENT_FOLDERS);
		}

		await this.persistFolders();
	}

	async removeRecent(path: string) {
		this.files = this.files.filter((f) => f.path !== path);
		await this.persistFiles();
	}

	async removeRecentFolder(path: string) {
		this.folders = this.folders.filter((f) => f.path !== path);
		await this.persistFolders();
	}

	async clearRecent() {
		this.files = [];
		await this.persistFiles();
	}

	async clearRecentFolders() {
		this.folders = [];
		await this.persistFolders();
	}

	private async persistFiles() {
		await storeService.set<RecentFile[]>('recentFiles', this.files);
	}

	private async persistFolders() {
		await storeService.set<RecentFolder[]>('recentFolders', this.folders);
	}
}

export const recentStore = new RecentStore();
