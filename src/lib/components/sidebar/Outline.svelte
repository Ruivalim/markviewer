<script lang="ts">
	import { Hash } from 'lucide-svelte';
	import { filesStore } from '$lib/stores/files.svelte';
	import { onDestroy } from 'svelte';

	interface Heading {
		level: number;
		text: string;
		line: number;
	}

	// Debounced headings - only update every 500ms
	let headings = $state<Heading[]>([]);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function parseHeadings(content: string): Heading[] {
		const lines = content.split('\n');
		const result: Heading[] = [];

		lines.forEach((line, index) => {
			const match = line.match(/^(#{1,6})\s+(.+)$/);
			if (match) {
				result.push({
					level: match[1].length,
					text: match[2].trim(),
					line: index + 1
				});
			}
		});

		return result;
	}

	$effect(() => {
		const content = filesStore.activeBuffer?.content ?? '';

		if (debounceTimer) clearTimeout(debounceTimer);

		debounceTimer = setTimeout(() => {
			headings = parseHeadings(content);
		}, 500);
	});

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
	});

	function scrollToLine(line: number) {
		const event = new CustomEvent('outline-navigate', { detail: { line } });
		window.dispatchEvent(event);
	}
</script>

<div class="flex-1 overflow-auto p-2">
	{#if headings.length === 0}
		<div class="px-2 py-4 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum heading encontrado</div>
	{:else}
		<ul class="space-y-0.5">
			{#each headings as heading, i (i)}
				<li>
					<button
						class="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
						style="padding-left: {(heading.level - 1) * 12 + 8}px"
						onclick={() => scrollToLine(heading.line)}
					>
						<Hash size={12} class="flex-shrink-0 text-slate-400 dark:text-slate-500" />
						<span class="truncate text-slate-700 dark:text-slate-300">
							{heading.text}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
