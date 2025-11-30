<script lang="ts">
	import { X, FileDown } from 'lucide-svelte';
	import type { PdfExportOptions } from '$lib/types';
	import { generatePdf } from './pdf-generator';
	import { settingsStore } from '$lib/stores/settings.svelte';

	interface Props {
		content: string;
		onClose: () => void;
	}

	let { content, onClose }: Props = $props();

	let options = $state<PdfExportOptions>({
		theme: settingsStore.theme,
		pageSize: 'A4',
		margins: 'normal'
	});

	let isExporting = $state(false);

	async function handleExport() {
		isExporting = true;
		try {
			await generatePdf(content, options);
			onClose();
		} catch (error) {
			console.error('Failed to export PDF:', error);
		} finally {
			isExporting = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
	onclick={handleBackdropClick}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
>
	<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800" role="document">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Exportar PDF</h2>
			<button class="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700" onclick={onClose}>
				<X size={20} />
			</button>
		</div>

		<div class="space-y-4">
			<div>
				<label for="pdf-theme" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"> Tema </label>
				<select
					id="pdf-theme"
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-colors focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
					bind:value={options.theme}
				>
					<option value="light">Claro</option>
					<option value="dark">Escuro</option>
				</select>
			</div>

			<div>
				<label for="pdf-pagesize" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"> Tamanho da Pagina </label>
				<select
					id="pdf-pagesize"
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-colors focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
					bind:value={options.pageSize}
				>
					<option value="A4">A4</option>
					<option value="Letter">Carta (Letter)</option>
					<option value="Legal">Legal</option>
				</select>
			</div>

			<div>
				<label for="pdf-margins" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"> Margens </label>
				<select
					id="pdf-margins"
					class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-colors focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
					bind:value={options.margins}
				>
					<option value="narrow">Estreitas</option>
					<option value="normal">Normais</option>
					<option value="wide">Largas</option>
				</select>
			</div>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<button class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700" onclick={onClose}> Cancelar </button>
			<button
				class="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
				onclick={handleExport}
				disabled={isExporting}
			>
				<FileDown size={16} />
				{isExporting ? 'Exportando...' : 'Exportar'}
			</button>
		</div>
	</div>
</div>
