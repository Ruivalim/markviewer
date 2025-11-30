<script lang="ts">
	import { Plus } from 'lucide-svelte';
	import Tab from './Tab.svelte';
	import { filesStore } from '$lib/stores/files.svelte';

	interface Props {
		onCloseBuffer: (id: string) => void;
	}

	let { onCloseBuffer }: Props = $props();

	let dragSourceIndex = $state<number | null>(null);
	let dragTargetIndex = $state<number | null>(null);

	function handleDragStart(index: number) {
		dragSourceIndex = index;
	}

	function handleDragOver(index: number) {
		dragTargetIndex = index;
	}

	function handleDragEnd() {
		if (dragSourceIndex !== null && dragTargetIndex !== null) {
			filesStore.reorderBuffers(dragSourceIndex, dragTargetIndex);
		}
		dragSourceIndex = null;
		dragTargetIndex = null;
	}
</script>

<div class="flex items-center border-b border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
	<div class="flex flex-1 overflow-x-auto">
		{#each filesStore.buffers as buffer, index (buffer.id)}
			<Tab {buffer} {index} {onCloseBuffer} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} isDragTarget={dragTargetIndex === index && dragSourceIndex !== index} />
		{/each}
	</div>

	<button
		class="flex-shrink-0 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
		onclick={() => filesStore.createNew()}
		title="Novo arquivo"
	>
		<Plus size={18} />
	</button>
</div>
