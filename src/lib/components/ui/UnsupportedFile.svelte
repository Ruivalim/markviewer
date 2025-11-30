<script lang="ts">
	import { FileX } from 'lucide-svelte';

	interface Props {
		filename: string;
	}

	let { filename }: Props = $props();
</script>

<div class="flex h-full flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900">
	<div class="rounded-2xl bg-red-500/10 p-4">
		<FileX size={48} class="text-red-500" />
	</div>
	<div class="text-center">
		<h2 class="mb-2 text-xl font-semibold text-slate-900 dark:text-white">Arquivo nao suportado</h2>
		<p class="text-slate-500 dark:text-slate-400">
			O arquivo <span class="font-medium text-slate-700 dark:text-slate-300">{filename}</span> nao e um arquivo Markdown.
		</p>
		<p class="mt-1 text-sm text-slate-400 dark:text-slate-500">Apenas arquivos .md e .markdown sao suportados.</p>
	</div>
</div>
