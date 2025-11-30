<script lang="ts">
	import { FileText, FolderOpen, Plus, Clock, Folder } from 'lucide-svelte';
	import { filesStore } from '$lib/stores/files.svelte';
	import { recentStore } from '$lib/stores/recent.svelte';

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) return 'Hoje';
		if (days === 1) return 'Ontem';
		if (days < 7) return `${days} dias atras`;
		return date.toLocaleDateString('pt-BR');
	}

	async function openRecentFile(path: string) {
		await filesStore.openFile(path);
	}

	async function openRecentFolder(path: string) {
		await filesStore.openFolderPath(path);
	}
</script>

<div class="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
	<div class="mb-8 text-center">
		<div class="mb-3 flex justify-center">
			<div class="rounded-xl bg-cyan-500/10 p-3">
				<FileText size={36} class="text-cyan-500" />
			</div>
		</div>
		<h1 class="mb-1 text-2xl font-bold text-slate-900 dark:text-white">MarkViewer</h1>
		<p class="text-sm text-slate-500 dark:text-slate-400">Editor de Markdown</p>
	</div>

	<!-- Action Links -->
	<div class="mb-8 flex items-center gap-6 text-sm">
		<button class="flex items-center gap-1.5 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300" onclick={() => filesStore.createNew()}>
			<Plus size={16} />
			<span>Novo</span>
		</button>
		<button class="flex items-center gap-1.5 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300" onclick={() => filesStore.openFileDialog()}>
			<FileText size={16} />
			<span>Abrir Arquivo</span>
		</button>
		<button class="flex items-center gap-1.5 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300" onclick={() => filesStore.openFolderDialog()}>
			<FolderOpen size={16} />
			<span>Abrir Pasta</span>
		</button>
	</div>

	<!-- Recent Items -->
	<div class="flex w-full max-w-2xl gap-8 px-4">
		<!-- Recent Files -->
		{#if recentStore.files.length > 0}
			<div class="flex-1">
				<div class="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
					<Clock size={12} />
					Arquivos Recentes
				</div>
				<div class="space-y-0.5">
					{#each recentStore.files as file (file.path)}
						<button
							class="group flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
							onclick={() => openRecentFile(file.path)}
							title={file.path}
						>
							<FileText size={14} class="flex-shrink-0 text-slate-400 group-hover:text-cyan-500" />
							<span class="flex-1 truncate text-slate-600 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-200">
								{file.name}
							</span>
							<span class="flex-shrink-0 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100">
								{formatDate(file.openedAt)}
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Recent Folders -->
		{#if recentStore.folders.length > 0}
			<div class="flex-1">
				<div class="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
					<Folder size={12} />
					Pastas Recentes
				</div>
				<div class="space-y-0.5">
					{#each recentStore.folders as folder (folder.path)}
						<button
							class="group flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
							onclick={() => openRecentFolder(folder.path)}
							title={folder.path}
						>
							<FolderOpen size={14} class="flex-shrink-0 text-slate-400 group-hover:text-amber-500" />
							<span class="flex-1 truncate text-slate-600 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-200">
								{folder.name}
							</span>
							<span class="flex-shrink-0 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100">
								{formatDate(folder.openedAt)}
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Empty state -->
	{#if recentStore.files.length === 0 && recentStore.folders.length === 0}
		<p class="text-sm text-slate-400 dark:text-slate-500">Nenhum arquivo ou pasta recente</p>
	{/if}
</div>
