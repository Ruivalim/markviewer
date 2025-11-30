<script lang="ts">
	interface Props {
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		destructive?: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', destructive = false, onConfirm, onCancel }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
		} else if (e.key === 'Enter') {
			onConfirm();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onclick={onCancel}>
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800" onclick={(e) => e.stopPropagation()}>
		<h2 class="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
			{title}
		</h2>
		<p class="mb-6 text-slate-600 dark:text-slate-300">
			{message}
		</p>
		<div class="flex justify-end gap-3">
			<button class="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700" onclick={onCancel}>
				{cancelText}
			</button>
			<button class="rounded-md px-4 py-2 text-sm font-medium text-white {destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-600 hover:bg-cyan-700'}" onclick={onConfirm}>
				{confirmText}
			</button>
		</div>
	</div>
</div>
