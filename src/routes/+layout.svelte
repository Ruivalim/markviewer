<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { recentStore } from '$lib/stores/recent.svelte';
	import { stylesStore } from '$lib/stores/styles.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';

	let { children } = $props();

	onMount(async () => {
		await settingsStore.init();
		await recentStore.init();
		await stylesStore.init();
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="h-full">
	{@render children()}
</div>

<ToastContainer />
