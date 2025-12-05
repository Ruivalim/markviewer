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
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
	import KeyboardShortcutsModal from '$lib/components/ui/KeyboardShortcutsModal.svelte';
	import CommandPalette from '$lib/components/ui/CommandPalette.svelte';
	import CodeViewer from '$lib/components/code/CodeViewer.svelte';
	import ConfigEditor from '$lib/components/code/ConfigEditor.svelte';
	import { filesStore } from '$lib/stores/files.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	let showPdfModal = $state(false);
	let showSettings = $state(false);
	let showKeyboardShortcuts = $state(false);
	let showCommandPalette = $state(false);
	let isDragging = $state(false);
	let pendingCloseBufferId = $state<string | null>(null);

	// Derived state for preview content - ensures reactivity when buffer content changes
	let previewContent = $derived.by(() => {
		const id = filesStore.activeBufferId;
		if (!id) return '';
		const buffer = filesStore.buffers.find((b) => b.id === id);
		return buffer?.content ?? '';
	});

	// Derived state for file type
	let previewFileType = $derived.by(() => {
		const id = filesStore.activeBufferId;
		if (!id) return 'markdown' as const;
		const buffer = filesStore.buffers.find((b) => b.id === id);
		return buffer?.fileType ?? 'markdown';
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

	async function installCliCommand() {
		const { invoke } = await import('@tauri-apps/api/core');
		const { message } = await import('@tauri-apps/plugin-dialog');

		try {
			const result = await invoke<string>('install_cli_command');
			await message(result, { title: 'Sucesso', kind: 'info' });
		} catch (error) {
			await message(String(error), { title: 'Erro', kind: 'error' });
		}
	}

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
		let unlistenCli: (() => void) | undefined;

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
					case 'install_cli':
						installCliCommand();
						break;
				}
			});

			unlistenDrop = await listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
				isDragging = false;
				const paths = event.payload.paths;

				// Text file extensions for drag-drop support
				const textExtensions = ['.txt', '.text', '.log'];

				for (const path of paths) {
					const ext = path.toLowerCase().substring(path.lastIndexOf('.'));

					// Markdown files - open them
					if (ext === '.md' || ext === '.markdown') {
						await filesStore.openFile(path);
					}
					// Text files - open them
					else if (textExtensions.includes(ext)) {
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

			// CLI arguments - open file or folder passed via command line
			unlistenCli = await listen<string>('cli-open', async (event) => {
				const path = event.payload;
				if (!path) return;

				// Check if it's a directory or file
				const { stat } = await import('@tauri-apps/plugin-fs');
				try {
					const info = await stat(path);
					if (info.isDirectory) {
						await filesStore.openFolderPath(path);
					} else {
						await filesStore.openFile(path);
					}
				} catch (error) {
					console.error('Failed to open path from CLI:', error);
				}
			});
		})();

		return () => {
			unlistenDrop?.();
			unlistenDragEnter?.();
			unlistenDragLeave?.();
			unlistenMenu?.();
			unlistenCli?.();
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
		// Cmd+K: Open command palette (if multiple buffers or folder open)
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			if (filesStore.buffers.length > 0 || filesStore.openFolder) {
				showCommandPalette = true;
			}
		}
		// Cmd+Shift+F: Toggle focus mode
		if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
			e.preventDefault();
			settingsStore.toggleFocusMode();
		}
		// Escape: Exit focus mode
		if (e.key === 'Escape' && settingsStore.focusMode) {
			e.preventDefault();
			settingsStore.toggleFocusMode();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
	{#if !settingsStore.focusMode}
		<TopBar onExportPdf={() => (showPdfModal = true)} onOpenSettings={() => (showSettings = true)} />
	{/if}

	<div class="flex flex-1 overflow-hidden">
		{#if settingsStore.sidebarVisible && !settingsStore.focusMode}
			<Sidebar />
		{/if}

		<main class="flex flex-1 flex-col overflow-hidden">
			{#if filesStore.buffers.length > 0 && !settingsStore.focusMode}
				<TabBar onCloseBuffer={requestCloseBuffer} />
			{/if}

			<div class="flex flex-1 flex-col overflow-hidden">
				{#if filesStore.activeBuffer}
					{#if filesStore.activeBuffer.fileType === 'code' && filesStore.activeBuffer.readOnly}
						<!-- Code file: read-only viewer -->
						<CodeViewer
							content={filesStore.activeBuffer.content}
							language={filesStore.activeBuffer.language ?? 'plaintext'}
							filePath={filesStore.activeBuffer.path}
						/>
					{:else if filesStore.activeBuffer.fileType === 'code' && !filesStore.activeBuffer.readOnly}
						<!-- Config file (JSON, YAML, TOML): editable with syntax highlighting -->
						<ConfigEditor />
					{:else if settingsStore.viewMode === 'edit'}
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
						<Preview content={previewContent} fileType={previewFileType} />
					{:else}
						<!-- Split view -->
						<EditorToolbar />
						<div class="flex flex-1 overflow-hidden">
							<div class="flex h-full w-1/2 flex-col border-r border-slate-200 dark:border-slate-700">
								<Editor />
							</div>
							<div class="h-full w-1/2 overflow-auto">
								<Preview content={previewContent} fileType={previewFileType} />
							</div>
						</div>
					{/if}
				{:else}
					<WelcomeScreen />
				{/if}
			</div>

			{#if !settingsStore.focusMode}
				<StatusBar />
			{/if}
		</main>
	</div>
</div>

<!-- Focus mode indicator -->
{#if settingsStore.focusMode}
	<div class="fixed bottom-4 right-4 z-40 rounded-lg bg-slate-800/90 px-3 py-1.5 text-xs text-slate-400 shadow-lg">
		<kbd class="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-slate-300">Esc</kbd> para sair do Focus Mode
	</div>
{/if}

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

<SettingsModal open={showSettings} onClose={() => (showSettings = false)} />

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

<CommandPalette open={showCommandPalette} onClose={() => (showCommandPalette = false)} />
