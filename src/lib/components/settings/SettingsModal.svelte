<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { stylesStore } from '$lib/stores/styles.svelte';
	import { X, RotateCcw } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import type { ExternalEditor } from '$lib/types';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open, onClose }: Props = $props();

	// Tab state
	let activeTab = $state<'general' | 'editor' | 'styles-headings' | 'styles-elements' | 'styles-lists'>('general');

	// Get current theme for preview
	const isDark = $derived(settingsStore.theme === 'dark');

	// Heading levels for iteration
	const headingLevels = [1, 2, 3, 4, 5, 6] as const;

	// Bullet options
	const bulletOptions = ['•', '◦', '▪', '▸', '-', '*', '→'];

	// External editor options
	const editorOptions = [
		{ value: 'vscode', label: 'VS Code' },
		{ value: 'cursor', label: 'Cursor' },
		{ value: 'neovide', label: 'Neovide' },
		{ value: 'terminal', label: 'Terminal' },
		{ value: 'custom', label: 'Personalizado' }
	];

	// Spell check language options
	const spellCheckLanguageOptions = [
		{ value: 'pt-BR', label: 'Português (Brasil)' },
		{ value: 'en-US', label: 'English (US)' }
	];

	// Size options for Select
	const sizeOptions = [
		{ value: '3em', label: '3em' },
		{ value: '2.5em', label: '2.5em' },
		{ value: '2.25em', label: '2.25em' },
		{ value: '2em', label: '2em' },
		{ value: '1.875em', label: '1.875em' },
		{ value: '1.75em', label: '1.75em' },
		{ value: '1.5em', label: '1.5em' },
		{ value: '1.25em', label: '1.25em' },
		{ value: '1.125em', label: '1.125em' },
		{ value: '1em', label: '1em' },
		{ value: '0.875em', label: '0.875em' }
	];

	// Weight options for Select
	const weightOptions = [
		{ value: '400', label: '400 (Normal)' },
		{ value: '500', label: '500 (Medium)' },
		{ value: '600', label: '600 (Semibold)' },
		{ value: '700', label: '700 (Bold)' },
		{ value: '800', label: '800 (Extrabold)' },
		{ value: '900', label: '900 (Black)' }
	];

	// Border width options
	const borderWidthOptions = [
		{ value: '1', label: '1px' },
		{ value: '2', label: '2px' },
		{ value: '3', label: '3px' },
		{ value: '4', label: '4px' },
		{ value: '5', label: '5px' }
	];

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function updateHeadingColor(level: 1 | 2 | 3 | 4 | 5 | 6, colorLight: string, colorDark: string) {
		stylesStore.updateHeading(level, { colorLight, colorDark });
	}

	function updateHeadingSize(level: 1 | 2 | 3 | 4 | 5 | 6, fontSize: string) {
		stylesStore.updateHeading(level, { fontSize });
	}

	function updateHeadingWeight(level: 1 | 2 | 3 | 4 | 5 | 6, fontWeight: number) {
		stylesStore.updateHeading(level, { fontWeight });
	}

	function resetSection(section: 'headings' | 'link' | 'inlineCode' | 'blockquote' | 'list' | 'codeBlock') {
		stylesStore.resetSection(section);
	}

	function handleExternalEditorChange(value: string) {
		settingsStore.setExternalEditor(value as ExternalEditor);
	}

	function handleSpellCheckLanguageChange(value: string) {
		settingsStore.setSpellCheckLanguage(value as 'pt-BR' | 'en-US');
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onclick={handleBackdropClick}>
		<div class="flex max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-800">
			<!-- Sidebar -->
			<div class="w-48 flex-shrink-0 border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-850">
				<div class="p-4">
					<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Configurações</h2>
				</div>
				<nav class="space-y-1 px-2">
					<button
						class="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors {activeTab === 'general'
							? 'bg-cyan-500/10 font-medium text-cyan-600 dark:text-cyan-400'
							: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'}"
						onclick={() => (activeTab = 'general')}
					>
						Geral
					</button>
					<button
						class="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors {activeTab === 'editor'
							? 'bg-cyan-500/10 font-medium text-cyan-600 dark:text-cyan-400'
							: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'}"
						onclick={() => (activeTab = 'editor')}
					>
						Editor Externo
					</button>
					<div class="py-2">
						<div class="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
							Estilos
						</div>
						<button
							class="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors {activeTab === 'styles-headings'
								? 'bg-cyan-500/10 font-medium text-cyan-600 dark:text-cyan-400'
								: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'}"
							onclick={() => (activeTab = 'styles-headings')}
						>
							Headings
						</button>
						<button
							class="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors {activeTab === 'styles-elements'
								? 'bg-cyan-500/10 font-medium text-cyan-600 dark:text-cyan-400'
								: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'}"
							onclick={() => (activeTab = 'styles-elements')}
						>
							Elementos
						</button>
						<button
							class="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors {activeTab === 'styles-lists'
								? 'bg-cyan-500/10 font-medium text-cyan-600 dark:text-cyan-400'
								: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'}"
							onclick={() => (activeTab = 'styles-lists')}
						>
							Listas
						</button>
					</div>
				</nav>
			</div>

			<!-- Content -->
			<div class="flex flex-1 flex-col">
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
					<h3 class="font-medium text-slate-900 dark:text-white">
						{#if activeTab === 'general'}Configurações Gerais
						{:else if activeTab === 'editor'}Editor Externo
						{:else if activeTab === 'styles-headings'}Estilos de Headings
						{:else if activeTab === 'styles-elements'}Estilos de Elementos
						{:else if activeTab === 'styles-lists'}Estilos de Listas
						{/if}
					</h3>
					<button onclick={onClose} class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
						<X size={20} />
					</button>
				</div>

				<!-- Content area -->
				<div class="flex-1 overflow-y-auto p-6">
					{#if activeTab === 'general'}
						<div class="space-y-6">
							<!-- Auto Save -->
							<div class="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-700">
								<div>
									<h4 class="font-medium text-slate-700 dark:text-slate-300">Auto Save</h4>
									<p class="text-sm text-slate-500 dark:text-slate-400">Salvar automaticamente ao editar</p>
								</div>
								<label class="relative inline-flex cursor-pointer items-center">
									<input type="checkbox" checked={settingsStore.autoSave} onchange={() => settingsStore.toggleAutoSave()} class="peer sr-only" />
									<div class="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700 dark:after:border-slate-600"></div>
								</label>
							</div>

							<!-- Spell Check -->
							<div class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
								<div class="flex items-center justify-between">
									<div>
										<h4 class="font-medium text-slate-700 dark:text-slate-300">Verificação Ortográfica</h4>
										<p class="text-sm text-slate-500 dark:text-slate-400">Verificar ortografia enquanto digita</p>
									</div>
									<label class="relative inline-flex cursor-pointer items-center">
										<input type="checkbox" checked={settingsStore.spellCheck} onchange={() => settingsStore.toggleSpellCheck()} class="peer sr-only" />
										<div class="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700 dark:after:border-slate-600"></div>
									</label>
								</div>
								{#if settingsStore.spellCheck}
									<div class="mt-4">
										<label class="mb-2 block text-sm text-slate-500 dark:text-slate-400">Idioma</label>
										<Select
											value={settingsStore.spellCheckLanguage}
											options={spellCheckLanguageOptions}
											onchange={handleSpellCheckLanguageChange}
											size="sm"
											searchable={false}
											class="w-48"
										/>
									</div>
								{/if}
							</div>

							<!-- Font Size -->
							<div class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
								<h4 class="mb-3 font-medium text-slate-700 dark:text-slate-300">Tamanho da Fonte</h4>
								<div class="flex items-center gap-4">
									<button
										onclick={() => settingsStore.zoomOut()}
										class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
									>
										A-
									</button>
									<span class="min-w-[3rem] text-center text-lg font-medium text-slate-700 dark:text-slate-300">
										{settingsStore.fontSize}
									</span>
									<button
										onclick={() => settingsStore.zoomIn()}
										class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
									>
										A+
									</button>
									<button
										onclick={() => settingsStore.resetZoom()}
										class="ml-2 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
									>
										Reset
									</button>
								</div>
							</div>
						</div>

					{:else if activeTab === 'editor'}
						<div class="space-y-6">
							<div class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
								<h4 class="mb-3 font-medium text-slate-700 dark:text-slate-300">Editor Preferido</h4>
								<p class="mb-4 text-sm text-slate-500 dark:text-slate-400">
									Escolha o editor que será aberto ao clicar em "Abrir no Editor" em arquivos de código.
								</p>
								<Select
									value={settingsStore.externalEditor}
									options={editorOptions}
									onchange={handleExternalEditorChange}
									size="sm"
									searchable={false}
									class="w-48"
								/>
							</div>

							{#if settingsStore.externalEditor === 'custom'}
								<div class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
									<h4 class="mb-3 font-medium text-slate-700 dark:text-slate-300">Comando Personalizado</h4>
									<p class="mb-3 text-sm text-slate-500 dark:text-slate-400">
										Digite o comando que será usado para abrir arquivos (ex: nvim, emacs, sublime).
									</p>
									<input
										type="text"
										value={settingsStore.customEditorCommand ?? ''}
										onchange={(e) => settingsStore.setCustomEditorCommand(e.currentTarget.value)}
										placeholder="nvim"
										class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
									/>
								</div>
							{/if}
						</div>

					{:else if activeTab === 'styles-headings'}
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<p class="text-sm text-slate-500 dark:text-slate-400">Personalize a aparência dos headings no preview.</p>
								<button onclick={() => resetSection('headings')} class="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
									<RotateCcw size={12} />
									Reset
								</button>
							</div>

							{#each headingLevels as level, i (i)}
								{@const heading = stylesStore.headings[`h${level}` as keyof typeof stylesStore.headings]}
								{@const previewColor = isDark ? heading.colorDark : heading.colorLight}
								<div class="rounded-lg border border-slate-200 p-4 dark:border-slate-600">
									<div class="mb-3 flex items-center justify-between">
										<span class="font-semibold" style="font-size: {heading.fontSize}; color: {previewColor}; font-weight: {heading.fontWeight};">
											Heading {level}
										</span>
									</div>

									<div class="grid grid-cols-3 gap-4">
										<!-- Size -->
										<div>
											<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Size</label>
											<Select value={heading.fontSize} options={sizeOptions} onchange={(val) => updateHeadingSize(level, val)} size="sm" searchable={false} />
										</div>

										<!-- Weight -->
										<div>
											<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Weight</label>
											<Select value={String(heading.fontWeight)} options={weightOptions} onchange={(val) => updateHeadingWeight(level, parseInt(val))} size="sm" searchable={false} />
										</div>

										<!-- Colors -->
										<div>
											<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Color</label>
											<div class="flex gap-2">
												<div class="flex items-center gap-1">
													<span class="text-[10px] text-slate-400">L</span>
													<input
														type="color"
														value={heading.colorLight}
														onchange={(e) => updateHeadingColor(level, e.currentTarget.value, heading.colorDark)}
														class="h-6 w-8 cursor-pointer rounded border border-slate-300"
													/>
												</div>
												<div class="flex items-center gap-1">
													<span class="text-[10px] text-slate-400">D</span>
													<input
														type="color"
														value={heading.colorDark}
														onchange={(e) => updateHeadingColor(level, heading.colorLight, e.currentTarget.value)}
														class="h-6 w-8 cursor-pointer rounded border border-slate-300"
													/>
												</div>
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>

					{:else if activeTab === 'styles-elements'}
						<div class="space-y-6">
							<!-- Links -->
							<div class="rounded-lg border border-slate-200 p-4 dark:border-slate-600">
								<div class="mb-3 flex items-center justify-between">
									<h4 class="font-medium text-slate-700 dark:text-slate-300">Links</h4>
									<button onclick={() => resetSection('link')} class="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
										<RotateCcw size={12} />
									</button>
								</div>
								<div class="grid grid-cols-3 gap-4">
									<div>
										<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Color Light</label>
										<input
											type="color"
											value={stylesStore.link.colorLight}
											onchange={(e) => stylesStore.updateLink({ colorLight: e.currentTarget.value })}
											class="h-8 w-full cursor-pointer rounded border border-slate-300"
										/>
									</div>
									<div>
										<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Color Dark</label>
										<input
											type="color"
											value={stylesStore.link.colorDark}
											onchange={(e) => stylesStore.updateLink({ colorDark: e.currentTarget.value })}
											class="h-8 w-full cursor-pointer rounded border border-slate-300"
										/>
									</div>
									<div>
										<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Underline</label>
										<label class="flex items-center gap-2">
											<input type="checkbox" checked={stylesStore.link.underline} onchange={(e) => stylesStore.updateLink({ underline: e.currentTarget.checked })} class="rounded" />
											<span class="text-sm text-slate-600 dark:text-slate-400">Show underline</span>
										</label>
									</div>
								</div>
							</div>

							<!-- Inline Code -->
							<div class="rounded-lg border border-slate-200 p-4 dark:border-slate-600">
								<div class="mb-3 flex items-center justify-between">
									<h4 class="font-medium text-slate-700 dark:text-slate-300">Inline Code</h4>
									<button
										onclick={() => resetSection('inlineCode')}
										class="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
									>
										<RotateCcw size={12} />
									</button>
								</div>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Background Light</label>
										<input
											type="text"
											value={stylesStore.inlineCode.backgroundLight}
											onchange={(e) => stylesStore.updateInlineCode({ backgroundLight: e.currentTarget.value })}
											class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
										/>
									</div>
									<div>
										<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Background Dark</label>
										<input
											type="text"
											value={stylesStore.inlineCode.backgroundDark}
											onchange={(e) => stylesStore.updateInlineCode({ backgroundDark: e.currentTarget.value })}
											class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
										/>
									</div>
								</div>
							</div>

							<!-- Blockquote -->
							<div class="rounded-lg border border-slate-200 p-4 dark:border-slate-600">
								<div class="mb-3 flex items-center justify-between">
									<h4 class="font-medium text-slate-700 dark:text-slate-300">Blockquote</h4>
									<button
										onclick={() => resetSection('blockquote')}
										class="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
									>
										<RotateCcw size={12} />
									</button>
								</div>
								<div class="grid grid-cols-3 gap-4">
									<div>
										<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Border Light</label>
										<input
											type="color"
											value={stylesStore.blockquote.borderColorLight}
											onchange={(e) => stylesStore.updateBlockquote({ borderColorLight: e.currentTarget.value })}
											class="h-8 w-full cursor-pointer rounded border border-slate-300"
										/>
									</div>
									<div>
										<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Border Dark</label>
										<input
											type="color"
											value={stylesStore.blockquote.borderColorDark}
											onchange={(e) => stylesStore.updateBlockquote({ borderColorDark: e.currentTarget.value })}
											class="h-8 w-full cursor-pointer rounded border border-slate-300"
										/>
									</div>
									<div>
										<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Border Width</label>
										<Select
											value={String(stylesStore.blockquote.borderWidth)}
											options={borderWidthOptions}
											onchange={(val) => stylesStore.updateBlockquote({ borderWidth: parseInt(val) })}
											size="sm"
											searchable={false}
										/>
									</div>
								</div>
							</div>
						</div>

					{:else if activeTab === 'styles-lists'}
						<div class="space-y-6">
							<div class="rounded-lg border border-slate-200 p-4 dark:border-slate-600">
								<div class="mb-3 flex items-center justify-between">
									<h4 class="font-medium text-slate-700 dark:text-slate-300">List Markers</h4>
									<button onclick={() => resetSection('list')} class="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
										<RotateCcw size={12} />
									</button>
								</div>

								<!-- Bullet character -->
								<div class="mb-4">
									<label class="mb-2 block text-xs text-slate-500 dark:text-slate-400">Bullet Character</label>
									<div class="flex flex-wrap gap-2">
										{#each bulletOptions as bullet, i (i)}
											<button
												class="flex h-10 w-10 items-center justify-center rounded-lg border-2 text-lg transition-all {stylesStore.list.bulletChar === bullet
													? 'border-cyan-500 bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'
													: 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500'}"
												onclick={() => stylesStore.updateList({ bulletChar: bullet })}
											>
												{bullet}
											</button>
										{/each}
									</div>
								</div>

								<!-- Colors -->
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Marker Color Light</label>
										<input
											type="color"
											value={stylesStore.list.colorLight}
											onchange={(e) => stylesStore.updateList({ colorLight: e.currentTarget.value })}
											class="h-8 w-full cursor-pointer rounded border border-slate-300"
										/>
									</div>
									<div>
										<label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Marker Color Dark</label>
										<input
											type="color"
											value={stylesStore.list.colorDark}
											onchange={(e) => stylesStore.updateList({ colorDark: e.currentTarget.value })}
											class="h-8 w-full cursor-pointer rounded border border-slate-300"
										/>
									</div>
								</div>

								<!-- Preview -->
								<div class="mt-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
									<p class="mb-2 text-xs text-slate-500">Preview:</p>
									<ul class="space-y-1 text-slate-700 dark:text-slate-300">
										<li>
											<span style="color: {isDark ? stylesStore.list.colorDark : stylesStore.list.colorLight}; font-weight: 600;">
												{stylesStore.list.bulletChar}
											</span>
											First list item
										</li>
										<li>
											<span style="color: {isDark ? stylesStore.list.colorDark : stylesStore.list.colorLight}; font-weight: 600;">
												{stylesStore.list.bulletChar}
											</span>
											Second list item
										</li>
										<li>
											<span style="color: {isDark ? stylesStore.list.colorDark : stylesStore.list.colorLight}; font-weight: 600;">
												{stylesStore.list.bulletChar}
											</span>
											Third list item
										</li>
									</ul>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Footer -->
				<div class="flex justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
					{#if activeTab.startsWith('styles')}
						<button onclick={() => stylesStore.resetToDefaults()} class="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
							Reset All Styles
						</button>
					{:else}
						<div></div>
					{/if}
					<button onclick={onClose} class="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600">
						Fechar
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.dark) .dark\:bg-slate-850 {
		background-color: rgb(30 41 59);
	}
</style>
