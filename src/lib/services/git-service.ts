// Git integration is disabled for now - Tauri 2 shell plugin requires scoped commands
// TODO: Re-enable git integration when shell scope is configured

export type GitFileStatus = 'modified' | 'staged' | 'untracked' | 'clean' | null;

export const gitService = {
	async isGitRepo(_folderPath: string): Promise<boolean> {
		// Disabled - always return false
		return false;
	},

	async getFileStatus(_filePath: string): Promise<GitFileStatus> {
		// Disabled
		return null;
	},

	async getFilesStatus(_folderPath: string): Promise<Map<string, GitFileStatus>> {
		// Disabled
		return new Map<string, GitFileStatus>();
	}
};
