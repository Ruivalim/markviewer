<script lang="ts">
	import { onMount } from 'svelte';
	import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
	import TopBar from '$lib/components/layout/TopBar.svelte';
	import TabBar from '$lib/components/tabs/TabBar.svelte';
	import Editor from '$lib/components/editor/Editor.svelte';
	import LiveEditor from '$lib/components/editor/LiveEditor.svelte';
	import EditorToolbar from '$lib/components/editor/EditorToolbar.svelte';
	import Preview from '$lib/components/preview/Preview.svelte';
	import StatusBar from '$lib/components/layout/StatusBar.svelte';
	import WelcomeScreen from '$lib/components/welcome/WelcomeScreen.svelte';
	import PdfExportModal from '$lib/components/pdf/PdfExportModal.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import StyleSettingsModal from '$lib/components/settings/StyleSettingsModal.svelte';
	import KeyboardShortcutsModal from '$lib/components/ui/KeyboardShortcutsModal.svelte';
	import { filesStore } from '$lib/stores/files.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	let showPdfModal = $state(false);
	let showStyleSettings = $state(false);
	let showKeyboardShortcuts = $state(false);
	let isDragging = $state(false);
	let pendingCloseBufferId = $state<string | null>(null);

	// Derived state for preview content - ensures reactivity when buffer content changes
	let previewContent = $derived.by(() => {
		const id = filesStore.activeBufferId;
		if (!id) return '';
		const buffer = filesStore.buffers.find((b) => b.id === id);
		return buffer?.content ?? '';
	});

	function requestCloseBuffer(id: string) {
		const buffer = filesStore.buffers.find((b) => b.id === id);
		if (buffer?.isDirty) {
			pendingCloseBufferId = id;
		} else {
			filesStore.closeBuffer(id);
		}
	}

	function confirmCloseBuffer() {
		if (pendingCloseBufferId) {
			filesStore.closeBuffer(pendingCloseBufferId);
			pendingCloseBufferId = null;
		}
	}

	function cancelCloseBuffer() {
		pendingCloseBufferId = null;
	}

	// Image extensions for drag-drop support
	const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];

	/**
	 * Calculate relative path from the current .md file to the dropped image
	 */
	function getRelativePath(imagePath: string, basePath: string | null): string {
		if (!basePath) return imagePath;

		// Get directory of the .md file
		const baseDir = basePath.substring(0, basePath.lastIndexOf('/'));

		// If image is in the same directory or a subdirectory
		if (imagePath.startsWith(baseDir + '/')) {
			return imagePath.substring(baseDir.length + 1);
		}

		// If image is in a parent or sibling directory, use absolute path
		return imagePath;
	}

	/**
	 * Dispatch event to insert text at cursor position in editor
	 */
	function insertTextInEditor(text: string) {
		window.dispatchEvent(new CustomEvent('editor-insert-text', { detail: { text } }));
	}

	onMount(() => {
		// Tauri drag-drop events
		let unlistenDrop: (() => void) | undefined;
		let unlistenDragEnter: (() => void) | undefined;
		let unlistenDragLeave: (() => void) | undefined;
		let unlistenMenu: (() => void) | undefined;

		(async () => {
			const { listen } = await import('@tauri-apps/api/event');

			// Menu events from native menu
			unlistenMenu = await listen<string>('menu-event', async (event) => {
				switch (event.payload) {
					case 'new_file':
						filesStore.createNew();
						break;
					case 'open_file':
						filesStore.openFileDialog();
						break;
					case 'open_folder':
						filesStore.openFolderDialog();
						break;
					case 'save':
						if (filesStore.activeBufferId) {
							filesStore.saveBuffer(filesStore.activeBufferId);
						}
						break;
					case 'save_as':
						if (filesStore.activeBufferId) {
							filesStore.saveBufferAs(filesStore.activeBufferId);
						}
						break;
					case 'close_tab':
						if (filesStore.activeBufferId) {
							requestCloseBuffer(filesStore.activeBufferId);
						}
						break;
					case 'toggle_sidebar':
						settingsStore.toggleSidebar();
						break;
					case 'toggle_view':
						settingsStore.toggleViewMode();
						break;
					case 'zoom_in':
						settingsStore.zoomIn();
						break;
					case 'zoom_out':
						settingsStore.zoomOut();
						break;
					case 'zoom_reset':
						settingsStore.resetZoom();
						break;
					case 'keyboard_shortcuts':
						showKeyboardShortcuts = true;
						break;
				}
			});

			unlistenDrop = await listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
				isDragging = false;
				const paths = event.payload.paths;

				for (const path of paths) {
					const ext = path.toLowerCase().substring(path.lastIndexOf('.'));

					// Markdown files - open them
					if (ext === '.md' || ext === '.markdown') {
						await filesStore.openFile(path);
					}
					// Image files - insert as markdown image
					else if (imageExtensions.includes(ext) && filesStore.activeBuffer) {
						const relativePath = getRelativePath(path, filesStore.activeBuffer.path);
						const fileName = path.substring(path.lastIndexOf('/') + 1);
						const altText = fileName.substring(0, fileName.lastIndexOf('.'));
						const imageMarkdown = `![${altText}](${relativePath})`;
						insertTextInEditor(imageMarkdown);
					}
				}
			});

			unlistenDragEnter = await listen('tauri://drag-enter', () => {
				isDragging = true;
			});

			unlistenDragLeave = await listen('tauri://drag-leave', () => {
				isDragging = false;
			});
		})();

		return () => {
			unlistenDrop?.();
			unlistenDragEnter?.();
			unlistenDragLeave?.();
			unlistenMenu?.();
		};
	});

	function handleKeydown(e: KeyboardEvent) {
		// Cmd+O: Open file
		if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
			e.preventDefault();
			filesStore.openFileDialog();
		}
		// Cmd+N: New file
		if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
			e.preventDefault();
			filesStore.createNew();
		}
		// Cmd+W: Close current buffer (prevent closing the app)
		if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
			e.preventDefault();
			if (filesStore.activeBufferId) {
				requestCloseBuffer(filesStore.activeBufferId);
			}
		}
		// Cmd+P: Toggle preview
		if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
			e.preventDefault();
			settingsStore.toggleViewMode();
		}
		// Cmd++: Zoom in
		if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
			e.preventDefault();
			settingsStore.zoomIn();
		}
		// Cmd+-: Zoom out
		if ((e.metaKey || e.ctrlKey) && e.key === '-') {
			e.preventDefault();
			settingsStore.zoomOut();
		}
		// Cmd+0: Reset zoom
		if ((e.metaKey || e.ctrlKey) && e.key === '0') {
			e.preventDefault();
			settingsStore.resetZoom();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
	<TopBar onExportPdf={() => (showPdfModal = true)} onOpenStyleSettings={() => (showStyleSettings = true)} />

	<div class="flex flex-1 overflow-hidden">
		{#if settingsStore.sidebarVisible}
			<Sidebar />
		{/if}

		<main class="flex flex-1 flex-col overflow-hidden">
			{#if filesStore.buffers.length > 0}
				<TabBar onCloseBuffer={requestCloseBuffer} />
			{/if}

			<div class="flex flex-1 flex-col overflow-hidden">
				{#if filesStore.activeBuffer}
					{#if settingsStore.viewMode === 'edit'}
						<EditorToolbar />
						<div class="flex-1 overflow-hidden">
							<Editor />
						</div>
					{:else if settingsStore.viewMode === 'live'}
						<!-- Live Editor + Preview -->
						<EditorToolbar />
						<div class="flex-1 overflow-hidden">
							<LiveEditor />
						</div>
					{:else if settingsStore.viewMode === 'preview'}
						<Preview content={previewContent} />
					{:else}
						<!-- Split view -->
						<EditorToolbar />
						<div class="flex flex-1 overflow-hidden">
							<div class="flex h-full w-1/2 flex-col border-r border-slate-200 dark:border-slate-700">
								<Editor />
							</div>
							<div class="h-full w-1/2 overflow-auto">
								<Preview content={previewContent} />
							</div>
						</div>
					{/if}
				{:else}
					<WelcomeScreen />
				{/if}
			</div>

			<StatusBar />
		</main>
	</div>
</div>

<!-- Drag overlay -->
{#if isDragging}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-cyan-500/20 backdrop-blur-sm">
		<div class="rounded-lg border-2 border-dashed border-cyan-500 bg-slate-900/80 px-8 py-6">
			<p class="text-lg font-medium text-cyan-400">Solte arquivos .md ou imagens</p>
			<p class="mt-1 text-sm text-slate-400">Markdown: abre arquivo | Imagem: insere no editor</p>
		</div>
	</div>
{/if}

{#if showPdfModal && filesStore.activeBuffer}
	<PdfExportModal content={filesStore.activeBuffer.content} onClose={() => (showPdfModal = false)} />
{/if}

<StyleSettingsModal open={showStyleSettings} onClose={() => (showStyleSettings = false)} />

<KeyboardShortcutsModal open={showKeyboardShortcuts} onClose={() => (showKeyboardShortcuts = false)} />

{#if pendingCloseBufferId}
	{@const buffer = filesStore.buffers.find((b) => b.id === pendingCloseBufferId)}
	{#if buffer}
		<ConfirmDialog
			title="Alteracoes nao salvas"
			message="O arquivo '{buffer.name}' tem alteracoes nao salvas. Deseja fechar mesmo assim?"
			confirmText="Fechar sem salvar"
			cancelText="Cancelar"
			destructive
			onConfirm={confirmCloseBuffer}
			onCancel={cancelCloseBuffer}
		/>
	{/if}
{/if}

{#if filesStore.fileChangedExternally}
	{@const buffer = filesStore.buffers.find((b) => b.id === filesStore.fileChangedExternally)}
	{#if buffer}
		<ConfirmDialog
			title="Arquivo modificado externamente"
			message="O arquivo '{buffer.name}' foi modificado por outro programa. Deseja recarregar e perder suas alteracoes locais?"
			confirmText="Recarregar"
			cancelText="Manter minhas alteracoes"
			destructive
			onConfirm={() => {
				filesStore.reloadBuffer(filesStore.fileChangedExternally!);
				filesStore.dismissExternalChange();
			}}
			onCancel={() => filesStore.dismissExternalChange()}
		/>
	{/if}
{/if}
