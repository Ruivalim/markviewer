<script lang="ts">
	import { FileText, X, Folder } from 'lucide-svelte';
	import { filesStore } from '$lib/stores/files.svelte';
	import { fileService } from '$lib/services/file-service';
	import type { FileTreeNode } from '$lib/types';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	interface FileResult {
		name: string;
		path: string;
		isOpen: boolean;
	}

	let { open, onClose }: Props = $props();

	let searchQuery = $state('');
	let selectedIndex = $state(0);
	let inputElement: HTMLInputElement | undefined = $state();

	// Recursively collect all files from file tree
	function collectAllFiles(nodes: FileTreeNode[]): FileResult[] {
		const files: FileResult[] = [];

		function traverse(nodes: FileTreeNode[]) {
			for (const node of nodes) {
				if (node.isDirectory) {
					if (node.children) {
						traverse(node.children);
					}
				} else if (fileService.isSupportedFile(node.name)) {
					// Check if file is already open
					const isOpen = filesStore.buffers.some(b => b.path === node.path);
					if (!isOpen) {
						files.push({
							name: node.name,
							path: node.path,
							isOpen: false
						});
					}
				}
			}
		}

		traverse(nodes);
		return files;
	}

	// Filter buffers based on search query
	let filteredBuffers = $derived.by(() => {
		if (!searchQuery.trim()) {
			return filesStore.buffers;
		}
		const query = searchQuery.toLowerCase();
		return filesStore.buffers.filter(
			(buffer) =>
				buffer.name.toLowerCase().includes(query) ||
				(buffer.path?.toLowerCase().includes(query) ?? false)
		);
	});

	// Filter folder files based on search query
	let filteredFolderFiles = $derived.by(() => {
		if (!searchQuery.trim() || !filesStore.openFolder) {
			return [];
		}
		const query = searchQuery.toLowerCase();
		const allFiles = collectAllFiles(filesStore.fileTree);
		return allFiles.filter(
			(file) =>
				file.name.toLowerCase().includes(query) ||
				file.path.toLowerCase().includes(query)
		).slice(0, 10); // Limit to 10 results for performance
	});

	// Combined results for keyboard navigation
	let allResults = $derived.by(() => {
		const results: Array<{ type: 'buffer' | 'file'; id?: string; path?: string; name: string }> = [];

		for (const buffer of filteredBuffers) {
			results.push({ type: 'buffer', id: buffer.id, name: buffer.name, path: buffer.path ?? undefined });
		}

		for (const file of filteredFolderFiles) {
			results.push({ type: 'file', path: file.path, name: file.name });
		}

		return results;
	});

	// Reset state when opening
	$effect(() => {
		if (open) {
			searchQuery = '';
			selectedIndex = 0;
			// Focus input after a tick
			setTimeout(() => inputElement?.focus(), 10);
		}
	});

	// Clamp selected index when results change
	$effect(() => {
		if (selectedIndex >= allResults.length) {
			selectedIndex = Math.max(0, allResults.length - 1);
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, allResults.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const selected = allResults[selectedIndex];
			if (selected) {
				selectResult(selected);
			}
		}
	}

	function selectResult(result: { type: 'buffer' | 'file'; id?: string; path?: string }) {
		if (result.type === 'buffer' && result.id) {
			filesStore.setActiveBuffer(result.id);
		} else if (result.type === 'file' && result.path) {
			filesStore.openFile(result.path);
		}
		onClose();
	}

	function selectBuffer(id: string) {
		filesStore.setActiveBuffer(id);
		onClose();
	}

	function openFile(path: string) {
		filesStore.openFile(path);
		onClose();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
		onkeydown={handleKeydown}
		onclick={handleBackdropClick}
	>
		<div class="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-slate-800">
			<!-- Search input -->
			<div class="flex items-center border-b border-slate-200 px-4 dark:border-slate-700">
				<input
					bind:this={inputElement}
					bind:value={searchQuery}
					type="text"
					placeholder={filesStore.openFolder ? "Buscar arquivos..." : "Buscar arquivo aberto..."}
					class="flex-1 bg-transparent py-3 text-sm text-slate-900 placeholder:text-slate-400 dark:text-slate-100 focus:outline-none"
				/>
				<button
					onclick={onClose}
					class="ml-2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
				>
					<X size={16} />
				</button>
			</div>

			<!-- Results -->
			<div class="max-h-80 overflow-y-auto">
				{#if allResults.length === 0}
					<div class="px-4 py-8 text-center text-sm text-slate-500">
						{#if filesStore.buffers.length === 0 && !filesStore.openFolder}
							Nenhum arquivo aberto
						{:else if !searchQuery.trim()}
							Digite para buscar...
						{:else}
							Nenhum resultado encontrado
						{/if}
					</div>
				{:else}
					{@const bufferCount = filteredBuffers.length}

					<!-- Open buffers section -->
					{#if filteredBuffers.length > 0}
						<div class="px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
							Abertos
						</div>
						{#each filteredBuffers as buffer, index (buffer.id)}
							<button
								class="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors {index ===
								selectedIndex
									? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
									: 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'}"
								onclick={() => selectBuffer(buffer.id)}
								onmouseenter={() => (selectedIndex = index)}
							>
								<FileText
									size={16}
									class={index === selectedIndex ? 'text-cyan-500' : 'text-slate-400'}
								/>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="truncate font-medium">{buffer.name}</span>
										{#if buffer.isDirty}
											<span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500"></span>
										{/if}
									</div>
									{#if buffer.path}
										<div class="truncate text-xs text-slate-400">{buffer.path}</div>
									{/if}
								</div>
							</button>
						{/each}
					{/if}

					<!-- Folder files section -->
					{#if filteredFolderFiles.length > 0}
						<div class="px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 {filteredBuffers.length > 0 ? 'mt-2 border-t border-slate-200 pt-2 dark:border-slate-700' : ''}">
							Na pasta
						</div>
						{#each filteredFolderFiles as file, i}
							{@const index = bufferCount + i}
							<button
								class="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors {index ===
								selectedIndex
									? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
									: 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'}"
								onclick={() => openFile(file.path)}
								onmouseenter={() => (selectedIndex = index)}
							>
								<Folder
									size={16}
									class={index === selectedIndex ? 'text-cyan-500' : 'text-slate-400'}
								/>
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium">{file.name}</div>
									<div class="truncate text-xs text-slate-400">{file.path}</div>
								</div>
							</button>
						{/each}
					{/if}
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-400 dark:border-slate-700">
				<span>
					<kbd class="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-700">↑↓</kbd>
					navegar
				</span>
				<span>
					<kbd class="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-700">Enter</kbd>
					abrir
				</span>
				<span>
					<kbd class="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-700">Esc</kbd>
					fechar
				</span>
			</div>
		</div>
	</div>
{/if}
