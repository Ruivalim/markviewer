<script lang="ts">
	import { X } from 'lucide-svelte';
	import type { FileBuffer } from '$lib/types';
	import { filesStore } from '$lib/stores/files.svelte';

	interface Props {
		buffer: FileBuffer;
		index: number;
		onCloseBuffer: (id: string) => void;
		onDragStart: (index: number) => void;
		onDragOver: (index: number) => void;
		onDragEnd: () => void;
		isDragTarget: boolean;
	}

	let { buffer, index, onCloseBuffer, onDragStart, onDragOver, onDragEnd, isDragTarget }: Props = $props();

	const isActive = $derived(filesStore.activeBufferId === buffer.id);

	const tabClass = $derived(
		isActive ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
	);

	function handleClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.close-btn')) {
			filesStore.setActiveBuffer(buffer.id);
		}
	}

	function handleClose(e: MouseEvent) {
		e.stopPropagation();
		onCloseBuffer(buffer.id);
	}

	function handleDragStart(e: DragEvent) {
		e.dataTransfer?.setData('text/plain', String(index));
		onDragStart(index);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		onDragOver(index);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		onDragEnd();
	}
</script>

<div
	class="group flex cursor-pointer items-center gap-2 border-r border-slate-200 px-3 py-2 text-sm transition-colors dark:border-slate-700 {tabClass} {isDragTarget
		? 'border-l-2 border-l-cyan-500'
		: ''}"
	onclick={handleClick}
	onkeydown={(e) => e.key === 'Enter' && handleClick(e as unknown as MouseEvent)}
	ondragstart={handleDragStart}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	ondragend={onDragEnd}
	draggable="true"
	role="tab"
	tabindex="0"
	aria-selected={isActive}
>
	<span class="flex items-center gap-1.5">
		{#if buffer.isDirty}
			<span class="h-2 w-2 rounded-full bg-cyan-500" title="Alteracoes nao salvas"></span>
		{/if}
		<span class="max-w-[120px] truncate">{buffer.name}</span>
	</span>

	<span
		class="close-btn rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-600"
		class:opacity-100={buffer.isDirty}
		onclick={handleClose}
		onkeydown={(e) => e.key === 'Enter' && handleClose(e as unknown as MouseEvent)}
		role="button"
		tabindex="0"
		aria-label="Fechar"
	>
		<X size={14} />
	</span>
</div>
