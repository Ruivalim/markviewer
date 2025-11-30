<script lang="ts">
	import { FileText } from 'lucide-svelte';
	import { filesStore } from '$lib/stores/files.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { markdownService } from '$lib/services/markdown-service';
	import { onDestroy } from 'svelte';

	const buffer = $derived(filesStore.activeBuffer);

	const viewModeLabels: Record<string, string> = {
		edit: 'Editor',
		live: 'Live',
		split: 'Split',
		preview: 'Preview'
	};

	// Debounced stats - only update every 500ms
	let wordCount = $state(0);
	let charCount = $state(0);
	let lineCount = $state(0);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		const content = buffer?.content ?? '';

		if (debounceTimer) clearTimeout(debounceTimer);

		debounceTimer = setTimeout(() => {
			wordCount = content ? markdownService.countWords(content) : 0;
			charCount = content ? markdownService.countCharacters(content) : 0;
			lineCount = content ? content.split('\n').length : 0;
		}, 500);
	});

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
	});
</script>

<footer class="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
	<div class="flex items-center gap-4">
		{#if buffer}
			<span class="flex items-center gap-1.5">
				<FileText size={12} />
				{buffer.name}
				{#if buffer.isDirty}
					<span class="text-cyan-500">(modificado)</span>
				{/if}
			</span>
		{:else}
			<span>Nenhum arquivo aberto</span>
		{/if}
	</div>

	{#if buffer}
		<div class="flex items-center gap-4">
			<span>{lineCount} linhas</span>
			<span>{wordCount} palavras</span>
			<span>{charCount} caracteres</span>
			<button onclick={() => settingsStore.toggleViewMode()} class="rounded px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700">
				{viewModeLabels[settingsStore.viewMode]}
			</button>
		</div>
	{/if}
</footer>
