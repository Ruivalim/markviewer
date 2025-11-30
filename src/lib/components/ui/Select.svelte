<script lang="ts">
	import { ChevronDown, Search, Check } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import type { Component } from 'svelte';

	interface Option {
		value: string;
		label: string;
		icon?: Component<{ size?: number; class?: string }>;
	}

	interface OptGroup {
		label: string;
		options: Option[];
	}

	interface Props {
		value: string;
		options?: Option[];
		groups?: OptGroup[];
		placeholder?: string;
		disabled?: boolean;
		size?: 'sm' | 'md' | 'lg';
		searchable?: boolean;
		showSelectedIcon?: boolean;
		class?: string;
		onchange?: (value: string) => void;
	}

	let {
		value = $bindable(),
		options = [],
		groups = [],
		placeholder = 'Select...',
		disabled = false,
		size = 'md',
		searchable = true,
		showSelectedIcon = false,
		class: className = '',
		onchange
	}: Props = $props();

	let isOpen = $state(false);
	let searchQuery = $state('');
	let highlightedIndex = $state(0);
	let containerRef = $state<HTMLDivElement | null>(null);
	let searchInputRef = $state<HTMLInputElement | null>(null);

	// Get all options flattened
	const allOptions = $derived.by(() => {
		if (options.length > 0) return options;
		return groups.flatMap((g) => g.options);
	});

	// Filter options based on search
	const filteredOptions = $derived.by(() => {
		if (!searchQuery.trim()) return options;
		const query = searchQuery.toLowerCase();
		return options.filter((opt) => opt.label.toLowerCase().includes(query));
	});

	const filteredGroups = $derived.by(() => {
		if (!searchQuery.trim()) return groups;
		const query = searchQuery.toLowerCase();
		return groups
			.map((group) => ({
				...group,
				options: group.options.filter((opt) => opt.label.toLowerCase().includes(query))
			}))
			.filter((group) => group.options.length > 0);
	});

	// Get all visible options for keyboard navigation
	const visibleOptions = $derived.by(() => {
		if (filteredOptions.length > 0) return filteredOptions;
		return filteredGroups.flatMap((g) => g.options);
	});

	// Get current selected option
	const selectedOption = $derived.by(() => {
		return allOptions.find((opt) => opt.value === value) || null;
	});

	// Get current selected label
	const selectedLabel = $derived.by(() => {
		return selectedOption?.label || placeholder;
	});

	function selectOption(opt: Option) {
		value = opt.value;
		onchange?.(opt.value);
		closeDropdown();
	}

	function openDropdown() {
		if (disabled) return;
		isOpen = true;
		searchQuery = '';
		highlightedIndex = 0;
		setTimeout(() => searchInputRef?.focus(), 10);
	}

	function closeDropdown() {
		isOpen = false;
		searchQuery = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) {
			if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
				e.preventDefault();
				openDropdown();
			}
			return;
		}

		switch (e.key) {
			case 'Escape':
				e.preventDefault();
				closeDropdown();
				break;
			case 'ArrowDown':
				e.preventDefault();
				highlightedIndex = Math.min(highlightedIndex + 1, visibleOptions.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, 0);
				break;
			case 'Enter':
				e.preventDefault();
				if (visibleOptions[highlightedIndex]) {
					selectOption(visibleOptions[highlightedIndex]);
				}
				break;
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (containerRef && !containerRef.contains(e.target as Node)) {
			closeDropdown();
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});

	const sizes = {
		sm: 'px-2 py-1 text-xs',
		md: 'px-3 py-1.5 text-sm',
		lg: 'px-4 py-2 text-base'
	};

	const iconSizes = {
		sm: 'w-3 h-3',
		md: 'w-4 h-4',
		lg: 'w-5 h-5'
	};
</script>

<div bind:this={containerRef} class={cn('relative', className)}>
	<!-- Trigger Button -->
	<button
		type="button"
		{disabled}
		onclick={openDropdown}
		onkeydown={handleKeydown}
		class={cn(
			'w-full cursor-pointer appearance-none rounded-lg border bg-white pr-8 text-left text-slate-900 transition-all dark:bg-slate-900 dark:text-slate-100',
			'border-slate-200 dark:border-slate-700',
			'hover:border-slate-300 dark:hover:border-slate-600',
			'focus:border-transparent focus:ring-2 focus:ring-accent-500 focus:outline-none',
			'disabled:cursor-not-allowed disabled:opacity-50',
			isOpen && 'border-transparent ring-2 ring-accent-500',
			sizes[size]
		)}
	>
		<span class={cn('flex items-center gap-2', !value && 'text-slate-400')}>
			{#if showSelectedIcon && selectedOption?.icon}
				<svelte:component this={selectedOption.icon} size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
			{/if}
			{selectedLabel}
		</span>
	</button>

	<ChevronDown class={cn('pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 transition-transform', isOpen && 'rotate-180', iconSizes[size])} />

	<!-- Dropdown -->
	{#if isOpen}
		<div class="absolute z-50 mt-1 w-full min-w-[200px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
			<!-- Search Input -->
			{#if searchable}
				<div class="border-b border-slate-200 p-2 dark:border-slate-700">
					<div class="relative">
						<Search class="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							bind:this={searchInputRef}
							type="text"
							bind:value={searchQuery}
							onkeydown={handleKeydown}
							placeholder="Search..."
							class="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-sm text-slate-900 placeholder-slate-400 focus:border-transparent focus:ring-2 focus:ring-accent-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
						/>
					</div>
				</div>
			{/if}

			<!-- Options List -->
			<div class="max-h-60 overflow-y-auto">
				{#if filteredOptions.length > 0}
					{#each filteredOptions as opt, i (i)}
						{@const isHighlighted = highlightedIndex === i}
						{@const isSelected = opt.value === value}
						<button
							type="button"
							onclick={() => selectOption(opt)}
							onmouseenter={() => (highlightedIndex = i)}
							class={cn(
								'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors',
								isHighlighted && 'bg-slate-100 dark:bg-slate-800',
								isSelected && 'font-medium text-accent-500',
								!isHighlighted && !isSelected && 'text-slate-700 dark:text-slate-300'
							)}
						>
							<span class="flex items-center gap-2">
								{#if opt.icon}
									<svelte:component this={opt.icon} size={16} class="flex-shrink-0" />
								{/if}
								{opt.label}
							</span>
							{#if isSelected}
								<Check class="h-4 w-4 flex-shrink-0 text-accent-500" />
							{/if}
						</button>
					{/each}
				{:else if filteredGroups.length > 0}
					{@const flatIndex = { current: 0 }}
					{#each filteredGroups as group (group.label)}
						<div class="bg-slate-50 px-3 py-1.5 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:bg-slate-800/50 dark:text-slate-400">
							{group.label}
						</div>
						{#each group.options as opt (`${group.label}-${opt.value}`)}
							{@const currentIndex = flatIndex.current++}
							{@const isHighlighted = highlightedIndex === currentIndex}
							{@const isSelected = opt.value === value}
							<button
								type="button"
								onclick={() => selectOption(opt)}
								onmouseenter={() => (highlightedIndex = currentIndex)}
								class={cn(
									'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors',
									isHighlighted && 'bg-slate-100 dark:bg-slate-800',
									isSelected && 'font-medium text-accent-500',
									!isHighlighted && !isSelected && 'text-slate-700 dark:text-slate-300'
								)}
							>
								<span class="flex items-center gap-2">
									{#if opt.icon}
										<svelte:component this={opt.icon} size={16} class="flex-shrink-0" />
									{/if}
									{opt.label}
								</span>
								{#if isSelected}
									<Check class="h-4 w-4 flex-shrink-0 text-accent-500" />
								{/if}
							</button>
						{/each}
					{/each}
				{:else}
					<div class="px-3 py-4 text-center text-sm text-slate-400">No results found</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
