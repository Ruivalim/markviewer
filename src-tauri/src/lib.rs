mod commands;
mod markdown;

use commands::{highlight_code_block, install_cli_command, open_in_editor, open_path, render_markdown, save_pasted_image};
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{Emitter, Manager};
use tauri_plugin_cli::CliExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // App menu (macOS)
            let app_menu = SubmenuBuilder::new(app, "MarkViewer")
                .item(&PredefinedMenuItem::about(app, Some("Sobre MarkViewer"), None)?)
                .separator()
                .item(&PredefinedMenuItem::services(app, None)?)
                .separator()
                .item(&PredefinedMenuItem::hide(app, Some("Ocultar MarkViewer"))?)
                .item(&PredefinedMenuItem::hide_others(app, Some("Ocultar Outros"))?)
                .item(&PredefinedMenuItem::show_all(app, Some("Mostrar Todos"))?)
                .separator()
                .item(&PredefinedMenuItem::quit(app, Some("Sair do MarkViewer"))?)
                .build()?;

            // File menu
            let new_file = MenuItemBuilder::with_id("new_file", "Novo")
                .accelerator("CmdOrCtrl+N")
                .build(app)?;
            let open_file = MenuItemBuilder::with_id("open_file", "Abrir...")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let open_folder = MenuItemBuilder::with_id("open_folder", "Abrir Pasta...")
                .accelerator("CmdOrCtrl+Shift+O")
                .build(app)?;
            let save = MenuItemBuilder::with_id("save", "Salvar")
                .accelerator("CmdOrCtrl+S")
                .build(app)?;
            let save_as = MenuItemBuilder::with_id("save_as", "Salvar Como...")
                .accelerator("CmdOrCtrl+Shift+S")
                .build(app)?;
            let close_tab = MenuItemBuilder::with_id("close_tab", "Fechar Aba")
                .accelerator("CmdOrCtrl+W")
                .build(app)?;

            let file_menu = SubmenuBuilder::new(app, "Arquivo")
                .item(&new_file)
                .item(&open_file)
                .item(&open_folder)
                .separator()
                .item(&save)
                .item(&save_as)
                .separator()
                .item(&close_tab)
                .build()?;

            // Edit menu
            let edit_menu = SubmenuBuilder::new(app, "Editar")
                .item(&PredefinedMenuItem::undo(app, Some("Desfazer"))?)
                .item(&PredefinedMenuItem::redo(app, Some("Refazer"))?)
                .separator()
                .item(&PredefinedMenuItem::cut(app, Some("Recortar"))?)
                .item(&PredefinedMenuItem::copy(app, Some("Copiar"))?)
                .item(&PredefinedMenuItem::paste(app, Some("Colar"))?)
                .item(&PredefinedMenuItem::select_all(app, Some("Selecionar Tudo"))?)
                .build()?;

            // View menu
            let toggle_sidebar = MenuItemBuilder::with_id("toggle_sidebar", "Alternar Sidebar")
                .accelerator("CmdOrCtrl+B")
                .build(app)?;
            let toggle_view = MenuItemBuilder::with_id("toggle_view", "Alternar Visualizacao")
                .accelerator("CmdOrCtrl+P")
                .build(app)?;
            let zoom_in = MenuItemBuilder::with_id("zoom_in", "Aumentar Zoom")
                .accelerator("CmdOrCtrl+Plus")
                .build(app)?;
            let zoom_out = MenuItemBuilder::with_id("zoom_out", "Diminuir Zoom")
                .accelerator("CmdOrCtrl+-")
                .build(app)?;
            let zoom_reset = MenuItemBuilder::with_id("zoom_reset", "Zoom Padrao")
                .accelerator("CmdOrCtrl+0")
                .build(app)?;

            let view_menu = SubmenuBuilder::new(app, "Visualizar")
                .item(&toggle_sidebar)
                .item(&toggle_view)
                .separator()
                .item(&zoom_in)
                .item(&zoom_out)
                .item(&zoom_reset)
                .separator()
                .item(&PredefinedMenuItem::fullscreen(app, Some("Tela Cheia"))?)
                .build()?;

            // Help menu
            let keyboard_shortcuts = MenuItemBuilder::with_id("keyboard_shortcuts", "Atalhos de Teclado")
                .accelerator("CmdOrCtrl+/")
                .build(app)?;
            let install_cli = MenuItemBuilder::with_id("install_cli", "Instalar comando 'mkv' no PATH...")
                .build(app)?;

            let help_menu = SubmenuBuilder::new(app, "Ajuda")
                .item(&keyboard_shortcuts)
                .separator()
                .item(&install_cli)
                .build()?;

            // Window menu
            let window_menu = SubmenuBuilder::new(app, "Janela")
                .item(&PredefinedMenuItem::minimize(app, Some("Minimizar"))?)
                .item(&PredefinedMenuItem::maximize(app, Some("Maximizar"))?)
                .separator()
                .item(&PredefinedMenuItem::close_window(app, Some("Fechar Janela"))?)
                .build()?;

            // Build the complete menu
            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&window_menu)
                .item(&help_menu)
                .build()?;

            app.set_menu(menu)?;

            // Handle CLI arguments
            if let Ok(matches) = app.cli().matches() {
                if let Some(path_arg) = matches.args.get("path") {
                    if let Some(path_str) = path_arg.value.as_str() {
                        if !path_str.is_empty() {
                            let path = path_str.to_string();
                            let window = app.get_webview_window("main").unwrap();
                            // Emit after a small delay to ensure frontend is ready
                            std::thread::spawn(move || {
                                std::thread::sleep(std::time::Duration::from_millis(500));
                                let _ = window.emit("cli-open", path);
                            });
                        }
                    }
                }
            }

            // Handle menu events
            app.on_menu_event(move |app_handle, event| {
                let window = app_handle.get_webview_window("main").unwrap();
                match event.id().as_ref() {
                    "new_file" => {
                        let _ = window.emit("menu-event", "new_file");
                    }
                    "open_file" => {
                        let _ = window.emit("menu-event", "open_file");
                    }
                    "open_folder" => {
                        let _ = window.emit("menu-event", "open_folder");
                    }
                    "save" => {
                        let _ = window.emit("menu-event", "save");
                    }
                    "save_as" => {
                        let _ = window.emit("menu-event", "save_as");
                    }
                    "close_tab" => {
                        let _ = window.emit("menu-event", "close_tab");
                    }
                    "toggle_sidebar" => {
                        let _ = window.emit("menu-event", "toggle_sidebar");
                    }
                    "toggle_view" => {
                        let _ = window.emit("menu-event", "toggle_view");
                    }
                    "zoom_in" => {
                        let _ = window.emit("menu-event", "zoom_in");
                    }
                    "zoom_out" => {
                        let _ = window.emit("menu-event", "zoom_out");
                    }
                    "zoom_reset" => {
                        let _ = window.emit("menu-event", "zoom_reset");
                    }
                    "keyboard_shortcuts" => {
                        let _ = window.emit("menu-event", "keyboard_shortcuts");
                    }
                    "install_cli" => {
                        let _ = window.emit("menu-event", "install_cli");
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            render_markdown,
            highlight_code_block,
            save_pasted_image,
            open_path,
            open_in_editor,
            install_cli_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
