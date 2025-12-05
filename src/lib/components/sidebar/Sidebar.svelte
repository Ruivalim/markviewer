<script lang="ts">
	import { Folder, X, List, FolderTree, Loader2 } from 'lucide-svelte';
	import FileTree from './FileTree.svelte';
	import Outline from './Outline.svelte';
	import { filesStore } from '$lib/stores/files.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	let activeTab = $state<'files' | 'outline'>('files');

	function getDisplayPath(path: string): string {
		const parts = path.split('/');
		return parts[parts.length - 1] || path;
	}
</script>

<aside class="flex h-full flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900" style="width: {settingsStore.sidebarWidth}px">
	<!-- Tab buttons -->
	<div class="flex border-b border-slate-200 dark:border-slate-700">
		<button
			class="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors {activeTab === 'files'
				? 'bg-white text-cyan-600 dark:bg-slate-800 dark:text-cyan-400'
				: 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}"
			onclick={() => (activeTab = 'files')}
		>
			<FolderTree size={16} />
			Arquivos
		</button>
		<button
			class="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors {activeTab === 'outline'
				? 'bg-white text-cyan-600 dark:bg-slate-800 dark:text-cyan-400'
				: 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}"
			onclick={() => (activeTab = 'outline')}
		>
			<List size={16} />
			Outline
		</button>
	</div>

	{#if activeTab === 'files'}
		<!-- Files header -->
		<div class="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
			<div class="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
				<Folder size={16} />
				{#if filesStore.openFolder}
					<span class="truncate" title={filesStore.openFolder}>
						{getDisplayPath(filesStore.openFolder)}
					</span>
				{:else}
					<span>Explorer</span>
				{/if}
			</div>
			{#if filesStore.openFolder}
				<button
					class="rounded p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
					onclick={() => filesStore.closeFolder()}
					title="Fechar pasta"
				>
					<X size={14} />
				</button>
			{/if}
		</div>

		<div class="relative min-h-0 flex-1">
			{#if filesStore.isLoadingFolder}
				<div class="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 dark:bg-slate-900/80">
					<div class="flex flex-col items-center gap-2">
						<Loader2 size={24} class="animate-spin text-cyan-500" />
						<span class="text-sm text-slate-500 dark:text-slate-400">Carregando pasta...</span>
					</div>
				</div>
			{/if}
			<FileTree />
		</div>
	{:else}
		<!-- Outline header -->
		<div class="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
			<List size={16} />
			<span>Sumario</span>
		</div>

		<Outline />
	{/if}
</aside>
