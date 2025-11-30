import { storeService } from '$lib/services/store-service';
import type { AppSettings, ViewMode } from '$lib/types';

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 15;

class SettingsStore {
	theme = $state<'light' | 'dark'>('dark');
	sidebarVisible = $state(true);
	sidebarWidth = $state(260);
	viewMode = $state<ViewMode>('live');
	fontSize = $state(DEFAULT_FONT_SIZE);
	autoSave = $state(true);
	autoSaveDelay = $state(2000); // ms

	async init() {
		const stored = await storeService.get<AppSettings>('settings');
		if (stored) {
			this.theme = stored.theme ?? 'dark';
			this.sidebarVisible = stored.sidebarVisible ?? true;
			this.sidebarWidth = stored.sidebarWidth ?? 260;
			this.fontSize = stored.fontSize ?? DEFAULT_FONT_SIZE;
			this.autoSave = stored.autoSave ?? true;
			this.autoSaveDelay = stored.autoSaveDelay ?? 2000;
		}
		this.applyTheme();
	}

	toggleTheme() {
		this.theme = this.theme === 'dark' ? 'light' : 'dark';
		this.applyTheme();
		this.persist();
	}

	toggleSidebar() {
		this.sidebarVisible = !this.sidebarVisible;
		this.persist();
	}

	setSidebarWidth(width: number) {
		this.sidebarWidth = width;
		this.persist();
	}

	toggleViewMode() {
		// Cycle: edit -> live -> split -> preview -> edit
		if (this.viewMode === 'edit') {
			this.viewMode = 'live';
		} else if (this.viewMode === 'live') {
			this.viewMode = 'split';
		} else if (this.viewMode === 'split') {
			this.viewMode = 'preview';
		} else {
			this.viewMode = 'edit';
		}
	}

	setViewMode(mode: ViewMode) {
		this.viewMode = mode;
	}

	zoomIn() {
		if (this.fontSize < MAX_FONT_SIZE) {
			this.fontSize = Math.min(this.fontSize + 1, MAX_FONT_SIZE);
			this.persist();
		}
	}

	zoomOut() {
		if (this.fontSize > MIN_FONT_SIZE) {
			this.fontSize = Math.max(this.fontSize - 1, MIN_FONT_SIZE);
			this.persist();
		}
	}

	resetZoom() {
		this.fontSize = DEFAULT_FONT_SIZE;
		this.persist();
	}

	toggleAutoSave() {
		this.autoSave = !this.autoSave;
		this.persist();
	}

	private applyTheme() {
		if (this.theme === 'dark') {
			document.documentElement.classList.add('dark');
			document.documentElement.classList.remove('light');
		} else {
			document.documentElement.classList.add('light');
			document.documentElement.classList.remove('dark');
		}
	}

	private async persist() {
		await storeService.set<AppSettings>('settings', {
			theme: this.theme,
			sidebarVisible: this.sidebarVisible,
			sidebarWidth: this.sidebarWidth,
			fontSize: this.fontSize,
			autoSave: this.autoSave,
			autoSaveDelay: this.autoSaveDelay
		});
	}
}

export const settingsStore = new SettingsStore();
