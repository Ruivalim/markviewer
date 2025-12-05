<script lang="ts">
	import { onMount } from 'svelte';

	interface MenuItem {
		label: string;
		icon?: typeof import('lucide-svelte').FileText;
		action: () => void;
		destructive?: boolean;
	}

	interface Props {
		items: MenuItem[];
		x: number;
		y: number;
		onClose: () => void;
	}

	let { items, x, y, onClose }: Props = $props();

	let menuElement: HTMLDivElement | undefined = $state();

	// Adjust position if menu would go off screen
	let adjustedX = $derived.by(() => {
		if (!menuElement) return x;
		const menuWidth = menuElement.offsetWidth;
		const windowWidth = window.innerWidth;
		if (x + menuWidth > windowWidth - 10) {
			return windowWidth - menuWidth - 10;
		}
		return x;
	});

	let adjustedY = $derived.by(() => {
		if (!menuElement) return y;
		const menuHeight = menuElement.offsetHeight;
		const windowHeight = window.innerHeight;
		if (y + menuHeight > windowHeight - 10) {
			return windowHeight - menuHeight - 10;
		}
		return y;
	});

	onMount(() => {
		function handleClickOutside(e: MouseEvent) {
			if (menuElement && !menuElement.contains(e.target as Node)) {
				onClose();
			}
		}

		function handleEscape(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				onClose();
			}
		}

		// Delay adding listeners to prevent immediate close
		setTimeout(() => {
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('keydown', handleEscape);
		}, 0);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleEscape);
		};
	});

	function handleItemClick(item: MenuItem) {
		item.action();
		onClose();
	}
</script>

<div
	bind:this={menuElement}
	class="fixed z-[100] min-w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
	style="left: {adjustedX}px; top: {adjustedY}px;"
>
	{#each items as item}
		<button
			class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors {item.destructive
				? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
				: 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}"
			onclick={() => handleItemClick(item)}
		>
			{#if item.icon}
				<svelte:component this={item.icon} size={14} />
			{/if}
			{item.label}
		</button>
	{/each}
</div>
