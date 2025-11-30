<script lang="ts">
	import { Sun, Moon } from 'lucide-svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
</script>

<button
	class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
	onclick={() => settingsStore.toggleTheme()}
	title={settingsStore.theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
>
	{#if settingsStore.theme === 'dark'}
		<Sun size={18} />
	{:else}
		<Moon size={18} />
	{/if}
</button>
