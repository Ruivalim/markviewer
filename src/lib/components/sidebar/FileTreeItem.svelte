<script lang="ts">
	import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-svelte';
	import type { FileTreeNode } from '$lib/types';
	import { filesStore } from '$lib/stores/files.svelte';
	import { fileService } from '$lib/services/file-service';

	interface Props {
		node: FileTreeNode;
		depth?: number;
	}

	let { node, depth = 0 }: Props = $props();

	async function handleClick() {
		if (node.isDirectory) {
			await filesStore.toggleFolderExpanded(node);
		} else {
			if (fileService.isMarkdownFile(node.name)) {
				await filesStore.openFile(node.path);
			}
		}
	}

	const isMarkdown = $derived(fileService.isMarkdownFile(node.name));
	const gitStatus = $derived(filesStore.getFileGitStatus(node.path));

	const gitStatusColor = $derived.by(() => {
		switch (gitStatus) {
			case 'modified':
				return 'text-amber-500';
			case 'staged':
				return 'text-green-500';
			case 'untracked':
				return 'text-slate-400';
			default:
				return '';
		}
	});
</script>

<div class="file-tree-item">
	<button
		class="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
		style="padding-left: {depth * 12 + 8}px"
		onclick={handleClick}
		class:opacity-50={!node.isDirectory && !isMarkdown}
	>
		{#if node.isDirectory}
			<span class="flex-shrink-0 text-slate-500">
				{#if node.isExpanded}
					<ChevronDown size={14} />
				{:else}
					<ChevronRight size={14} />
				{/if}
			</span>
			<span class="flex-shrink-0 text-amber-500">
				{#if node.isExpanded}
					<FolderOpen size={16} />
				{:else}
					<Folder size={16} />
				{/if}
			</span>
		{:else}
			<span class="w-[14px]"></span>
			<span class="flex-shrink-0" class:text-cyan-500={isMarkdown} class:text-slate-400={!isMarkdown}>
				<File size={16} />
			</span>
		{/if}
		<span class="truncate {gitStatusColor}" class:text-slate-400={!node.isDirectory && !isMarkdown && !gitStatus}>
			{node.name}
		</span>

		{#if gitStatus && gitStatus !== 'clean'}
			<span class="ml-auto flex-shrink-0 text-xs {gitStatusColor}" title={gitStatus}>
				{gitStatus === 'modified' ? 'M' : gitStatus === 'staged' ? 'S' : 'U'}
			</span>
		{/if}
	</button>

	{#if node.isDirectory && node.isExpanded && node.children}
		<div class="file-tree-children">
			{#each node.children as child (child.path)}
				<svelte:self node={child} depth={depth + 1} />
			{/each}
		</div>
	{/if}
</div>
