<script lang="ts">
	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open, onClose }: Props = $props();

	const shortcuts = [
		{
			category: 'Arquivo',
			items: [
				{ keys: ['Cmd', 'N'], description: 'Novo arquivo' },
				{ keys: ['Cmd', 'O'], description: 'Abrir arquivo' },
				{ keys: ['Cmd', 'Shift', 'O'], description: 'Abrir pasta' },
				{ keys: ['Cmd', 'S'], description: 'Salvar' },
				{ keys: ['Cmd', 'Shift', 'S'], description: 'Salvar como' },
				{ keys: ['Cmd', 'W'], description: 'Fechar aba' }
			]
		},
		{
			category: 'Navegacao',
			items: [
				{ keys: ['Cmd', 'K'], description: 'Buscar arquivos' },
				{ keys: ['Cmd', 'Shift', 'F'], description: 'Modo foco' }
			]
		},
		{
			category: 'Edicao',
			items: [
				{ keys: ['Cmd', 'Z'], description: 'Desfazer' },
				{ keys: ['Cmd', 'Shift', 'Z'], description: 'Refazer' },
				{ keys: ['Cmd', 'X'], description: 'Recortar' },
				{ keys: ['Cmd', 'C'], description: 'Copiar' },
				{ keys: ['Cmd', 'V'], description: 'Colar' },
				{ keys: ['Cmd', 'A'], description: 'Selecionar tudo' }
			]
		},
		{
			category: 'Formatacao',
			items: [
				{ keys: ['Cmd', 'B'], description: 'Negrito' },
				{ keys: ['Cmd', 'I'], description: 'Italico' },
				{ keys: ['Cmd', '`'], description: 'Codigo inline' }
			]
		},
		{
			category: 'Visualizacao',
			items: [
				{ keys: ['Cmd', 'P'], description: 'Alternar modo de visualizacao' },
				{ keys: ['Cmd', '\\'], description: 'Alternar sidebar' },
				{ keys: ['Cmd', '+'], description: 'Aumentar zoom' },
				{ keys: ['Cmd', '-'], description: 'Diminuir zoom' },
				{ keys: ['Cmd', '0'], description: 'Zoom padrao' }
			]
		}
	];

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="shortcuts-title"
		tabindex="-1"
	>
		<div class="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
			<div class="mb-6 flex items-center justify-between">
				<h2 id="shortcuts-title" class="text-xl font-semibold text-slate-900 dark:text-slate-100">Atalhos de Teclado</h2>
				<button onclick={onClose} class="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200" aria-label="Fechar">
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="grid gap-6 md:grid-cols-2">
				{#each shortcuts as section, i (i)}
					<div>
						<h3 class="mb-3 text-sm font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
							{section.category}
						</h3>
						<div class="space-y-2">
							{#each section.items as shortcut, j (`${i}-${j}`)}
								<div class="flex items-center justify-between rounded px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50">
									<span class="text-sm text-slate-700 dark:text-slate-300">{shortcut.description}</span>
									<div class="flex gap-1">
										{#each shortcut.keys as key, k (`${i}-${j}-${k}`)}
											<kbd class="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
												{key}
											</kbd>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<div class="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
				<p class="text-center text-xs text-slate-500 dark:text-slate-400">
					Pressione <kbd class="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-700">Esc</kbd> para fechar
				</p>
			</div>
		</div>
	</div>
{/if}
