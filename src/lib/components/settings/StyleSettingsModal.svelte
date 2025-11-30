<script lang="ts">
	import { stylesStore } from '$lib/stores/styles.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { X, RotateCcw } from 'lucide-svelte';
	import Select from '$lib/components/ui/Select.svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open, onClose }: Props = $props();

	// Tab state
	let activeTab = $state<'headings' | 'elements' | 'lists'>('headings');

	// Get current theme for preview
	const isDark = $derived(settingsStore.theme === 'dark');

	// Heading levels for iteration
	const headingLevels = [1, 2, 3, 4, 5, 6] as const;

	// Bullet options
	const bulletOptions = ['•', '◦', '▪', '▸', '-', '*', '→'];

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
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onclick={handleBackdropClick}>
		<div class="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-800">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-white">Style Settings</h2>
				<button onclick={onClose} class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
					<X size={20} />
				</button>
			</div>

			<!-- Tabs -->
			<div class="flex border-b border-slate-200 px-6 dark:border-slate-700">
				<button
					class="border-b-2 px-4 py-3 text-sm font-medium transition-colors {activeTab === 'headings'
						? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
						: 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}"
					onclick={() => (activeTab = 'headings')}
				>
					Headings
				</button>
				<button
					class="border-b-2 px-4 py-3 text-sm font-medium transition-colors {activeTab === 'elements'
						? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
						: 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}"
					onclick={() => (activeTab = 'elements')}
				>
					Elements
				</button>
				<button
					class="border-b-2 px-4 py-3 text-sm font-medium transition-colors {activeTab === 'lists'
						? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
						: 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}"
					onclick={() => (activeTab = 'lists')}
				>
					Lists
				</button>
			</div>

			<!-- Content -->
			<div class="max-h-[50vh] overflow-y-auto p-6">
				{#if activeTab === 'headings'}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">Heading Styles</h3>
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
				{:else if activeTab === 'elements'}
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
				{:else if activeTab === 'lists'}
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
				<button onclick={() => stylesStore.resetToDefaults()} class="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700">
					Reset All to Defaults
				</button>
				<button onclick={onClose} class="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"> Done </button>
			</div>
		</div>
	</div>
{/if}
