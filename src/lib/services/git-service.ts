import { Command } from '@tauri-apps/plugin-shell';

export type GitFileStatus = 'modified' | 'staged' | 'untracked' | 'clean' | null;

export const gitService = {
	async isGitRepo(folderPath: string): Promise<boolean> {
		try {
			console.log('[git] Checking if git repo:', folderPath);
			const command = Command.create('git', ['rev-parse', '--is-inside-work-tree'], {
				cwd: folderPath
			});
			const output = await command.execute();
			console.log('[git] isGitRepo result:', output);
			return output.code === 0 && output.stdout.trim() === 'true';
		} catch (error) {
			console.error('[git] isGitRepo error:', error);
			return false;
		}
	},

	async getFileStatus(filePath: string): Promise<GitFileStatus> {
		try {
			// Get the directory containing the file
			const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));

			const command = Command.create('git', ['status', '--porcelain', filePath], {
				cwd: dirPath
			});
			const output = await command.execute();

			if (output.code !== 0) return null;

			const line = output.stdout.trim();
			if (!line) return 'clean';

			return this.parseStatusCode(line.substring(0, 2));
		} catch {
			return null;
		}
	},

	async getFilesStatus(folderPath: string): Promise<Map<string, GitFileStatus>> {
		const statusMap = new Map<string, GitFileStatus>();

		try {
			console.log('[git] Getting files status for:', folderPath);
			const command = Command.create('git', ['status', '--porcelain', '-uall'], {
				cwd: folderPath
			});
			const output = await command.execute();
			console.log('[git] getFilesStatus result:', output);

			if (output.code !== 0) return statusMap;

			const lines = output.stdout.trim().split('\n').filter(Boolean);

			for (const line of lines) {
				if (line.length < 3) continue;

				const statusCode = line.substring(0, 2);
				const relativePath = line.substring(3).trim();
				// Handle renamed files (old -> new format)
				const actualPath = relativePath.includes(' -> ')
					? relativePath.split(' -> ')[1]
					: relativePath;

				const fullPath = `${folderPath}/${actualPath}`;
				const status = this.parseStatusCode(statusCode);
				if (status) {
					statusMap.set(fullPath, status);
				}
			}
		} catch (error) {
			console.error('Failed to get git status:', error);
		}

		return statusMap;
	},

	parseStatusCode(code: string): GitFileStatus {
		const index = code[0];
		const workTree = code[1];

		// Staged changes (in index)
		if (index === 'A' || index === 'M' || index === 'D' || index === 'R') {
			return 'staged';
		}

		// Modified in work tree
		if (workTree === 'M' || workTree === 'D') {
			return 'modified';
		}

		// Untracked
		if (code === '??') {
			return 'untracked';
		}

		return 'clean';
	}
};
