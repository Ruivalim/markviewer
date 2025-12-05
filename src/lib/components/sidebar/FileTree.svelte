<script lang="ts">
	import FileTreeItem from './FileTreeItem.svelte';
	import { filesStore } from '$lib/stores/files.svelte';
	import { FolderOpen } from 'lucide-svelte';
</script>

<div class="file-tree h-full overflow-y-auto p-2">
	{#if filesStore.fileTree.length > 0}
		{#each filesStore.fileTree as node (node.path)}
			<FileTreeItem {node} />
		{/each}
	{:else if filesStore.openFolder}
		<div class="flex flex-col items-center justify-center gap-2 py-8 text-slate-500">
			<FolderOpen size={32} />
			<p class="text-sm">Pasta vazia</p>
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center gap-2 py-8 text-slate-500">
			<FolderOpen size={32} />
			<p class="text-center text-sm">Nenhuma pasta aberta</p>
			<button class="mt-2 rounded bg-cyan-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-cyan-700" onclick={() => filesStore.openFolderDialog()}> Abrir Pasta </button>
		</div>
	{/if}
</div>
