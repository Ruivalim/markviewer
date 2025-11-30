<script lang="ts">
	import { FolderOpen, FileText, Save, FileDown, Eye, Edit3, PanelLeftClose, PanelLeft, Columns2, Sparkles, Palette } from 'lucide-svelte';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { filesStore } from '$lib/stores/files.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import type { ViewMode } from '$lib/types';

	interface Props {
		onExportPdf: () => void;
		onOpenStyleSettings: () => void;
	}

	let { onExportPdf, onOpenStyleSettings }: Props = $props();

	const canSave = $derived(filesStore.activeBuffer?.isDirty ?? false);
	const canExport = $derived(filesStore.activeBuffer !== null);
	let viewMode = $derived(settingsStore.viewMode);

	const viewModeOptions = [
		{ value: 'edit', label: 'Editar', icon: Edit3 },
		{ value: 'live', label: 'Live', icon: Sparkles },
		{ value: 'split', label: 'Split', icon: Columns2 },
		{ value: 'preview', label: 'Preview', icon: Eye }
	];

	function handleViewModeChange(value: string) {
		settingsStore.setViewMode(value as ViewMode);
	}

	const saveButtonClass = $derived(canSave ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700' : 'text-slate-400 dark:text-slate-500');

	const exportButtonClass = $derived(canExport ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700' : 'text-slate-400 dark:text-slate-500');
</script>

<header class="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
	<div class="flex items-center gap-1">
		<button
			class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
			onclick={() => settingsStore.toggleSidebar()}
			title={settingsStore.sidebarVisible ? 'Ocultar sidebar' : 'Mostrar sidebar'}
		>
			{#if settingsStore.sidebarVisible}
				<PanelLeftClose size={18} />
			{:else}
				<PanelLeft size={18} />
			{/if}
		</button>

		<div class="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700"></div>

		<button
			class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
			onclick={() => filesStore.openFileDialog()}
			title="Abrir arquivo (Ctrl+O)"
		>
			<FileText size={16} />
			<span class="hidden sm:inline">Abrir</span>
		</button>

		<button
			class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
			onclick={() => filesStore.openFolderDialog()}
			title="Abrir pasta"
		>
			<FolderOpen size={16} />
			<span class="hidden sm:inline">Pasta</span>
		</button>

		<button
			class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 {saveButtonClass}"
			onclick={() => filesStore.saveActiveBuffer()}
			disabled={!canSave}
			title="Salvar (Ctrl+S)"
		>
			<Save size={16} />
			<span class="hidden sm:inline">Salvar</span>
		</button>

		<button
			class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 {exportButtonClass}"
			onclick={onExportPdf}
			disabled={!canExport}
			title="Exportar PDF"
		>
			<FileDown size={16} />
			<span class="hidden sm:inline">PDF</span>
		</button>
	</div>

	<div class="flex items-center gap-1">
		{#if filesStore.activeBuffer}
			<Select value={viewMode} options={viewModeOptions} onchange={handleViewModeChange} size="sm" searchable={false} showSelectedIcon={true} class="w-32" />
		{/if}

		<div class="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700"></div>

		<button class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700" onclick={onOpenStyleSettings} title="Style Settings">
			<Palette size={18} />
		</button>

		<ThemeToggle />
	</div>
</header>
