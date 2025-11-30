<script lang="ts">
	import { toastStore, type ToastType } from '$lib/stores/toast.svelte';
	import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-svelte';
	import { fly } from 'svelte/transition';

	const icons: Record<ToastType, typeof CheckCircle> = {
		success: CheckCircle,
		error: AlertCircle,
		info: Info,
		warning: AlertTriangle
	};

	const colors: Record<ToastType, string> = {
		success: 'bg-emerald-500 text-white',
		error: 'bg-red-500 text-white',
		info: 'bg-cyan-500 text-white',
		warning: 'bg-amber-500 text-white'
	};
</script>

<div class="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
	{#each toastStore.toasts as toast (toast.id)}
		<div class="flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg {colors[toast.type]}" in:fly={{ x: 100, duration: 200 }} out:fly={{ x: 100, duration: 150 }}>
			<svelte:component this={icons[toast.type]} size={20} />
			<span class="text-sm font-medium">{toast.message}</span>
			<button class="ml-2 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100" onclick={() => toastStore.remove(toast.id)}>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>
