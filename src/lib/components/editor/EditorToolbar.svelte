<script lang="ts">
	import { Bold, Italic, Strikethrough, Code, Link, List, ListOrdered, Quote, Heading1, Heading2, Heading3, Minus, Image } from 'lucide-svelte';

	function dispatchFormat(format: string, extra?: string) {
		const event = new CustomEvent('editor-format', { detail: { format, extra } });
		window.dispatchEvent(event);
	}

	const buttons = [
		{ icon: Heading1, format: 'heading', extra: '1', title: 'Heading 1' },
		{ icon: Heading2, format: 'heading', extra: '2', title: 'Heading 2' },
		{ icon: Heading3, format: 'heading', extra: '3', title: 'Heading 3' },
		{ divider: true },
		{ icon: Bold, format: 'bold', title: 'Negrito (Cmd+B)' },
		{ icon: Italic, format: 'italic', title: 'Italico (Cmd+I)' },
		{ icon: Strikethrough, format: 'strikethrough', title: 'Riscado' },
		{ icon: Code, format: 'code', title: 'Codigo inline' },
		{ divider: true },
		{ icon: Link, format: 'link', title: 'Link' },
		{ icon: Image, format: 'image', title: 'Imagem' },
		{ divider: true },
		{ icon: List, format: 'bullet-list', title: 'Lista' },
		{ icon: ListOrdered, format: 'numbered-list', title: 'Lista numerada' },
		{ icon: Quote, format: 'blockquote', title: 'Citacao' },
		{ icon: Minus, format: 'hr', title: 'Linha horizontal' }
	] as const;
</script>

<div class="flex items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
	{#each buttons as button, i (i)}
		{#if 'divider' in button && button.divider}
			<div class="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600"></div>
		{:else if 'icon' in button}
			<button
				class="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
				onclick={() => dispatchFormat(button.format, 'extra' in button ? button.extra : undefined)}
				title={button.title}
			>
				<button.icon size={16} />
			</button>
		{/if}
	{/each}
</div>
