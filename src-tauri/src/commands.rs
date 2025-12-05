use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::command;

use crate::markdown::{
    extract_special_blocks, highlight_code, render_markdown_html, resolve_image_paths,
    SpecialBlock,
};

/// Result of rendering markdown
#[derive(Debug, Serialize)]
pub struct RenderResult {
    /// The rendered HTML
    pub html: String,
    /// Special blocks (mermaid, charts) that need JS rendering
    pub special_blocks: Vec<SpecialBlock>,
}

/// Options for rendering markdown
#[derive(Debug, Deserialize)]
pub struct RenderOptions {
    /// Theme: "light" or "dark"
    pub theme: String,
    /// Base path for resolving relative image paths (path to the .md file)
    pub base_path: Option<String>,
}

/// Renders markdown to HTML with syntax highlighting and special block extraction.
///
/// # Arguments
/// * `markdown` - The markdown content to render
/// * `options` - Rendering options (theme, base_path for images)
///
/// # Returns
/// * `RenderResult` containing HTML and special blocks for JS rendering
#[command]
pub fn render_markdown(markdown: String, options: RenderOptions) -> Result<RenderResult, String> {
    // 1. Extract special blocks (mermaid, chart) before parsing
    let (processed_md, special_blocks) = extract_special_blocks(&markdown);

    // 2. Render markdown to HTML with comrak
    let mut html = render_markdown_html(&processed_md);

    // 3. Resolve image paths if base_path is provided
    if let Some(ref base_path) = options.base_path {
        html = resolve_image_paths(&html, base_path);
    }

    Ok(RenderResult {
        html,
        special_blocks,
    })
}

/// Highlights a code block using syntect.
///
/// # Arguments
/// * `code` - The code to highlight
/// * `lang` - The language identifier (e.g., "rust", "javascript", "python")
///
/// # Returns
/// * The highlighted HTML string with syntax highlighting classes
#[command]
pub fn highlight_code_block(code: String, lang: String) -> String {
    highlight_code(&code, &lang)
}

/// Opens a path in the system file manager (Finder on macOS)
///
/// # Arguments
/// * `path` - The path to open (file or directory)
#[command]
pub fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open path: {}", e))?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open path: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open path: {}", e))?;
    }
    Ok(())
}

/// Opens a file in an external editor
///
/// # Arguments
/// * `command` - The command to run (e.g., "code", "cursor", "neovide")
/// * `args` - Arguments to pass to the command (usually the file path)
#[command]
pub fn open_in_editor(command: String, args: Vec<String>) -> Result<(), String> {
    std::process::Command::new(&command)
        .args(&args)
        .spawn()
        .map_err(|e| format!("Failed to open in editor '{}': {}", command, e))?;
    Ok(())
}

/// Saves image data (base64) to a file and returns the path.
///
/// # Arguments
/// * `base64_data` - The base64 encoded image data
/// * `base_path` - The path to the .md file (images will be saved in same directory)
/// * `filename` - Optional filename, will generate one if not provided
///
/// # Returns
/// * The relative path to the saved image
#[command]
pub fn save_pasted_image(
    base64_data: String,
    base_path: String,
    filename: Option<String>,
) -> Result<String, String> {
    // Decode base64
    use base64::{engine::general_purpose::STANDARD, Engine};

    // Remove data URL prefix if present
    let data = if base64_data.contains(",") {
        base64_data.split(",").last().unwrap_or(&base64_data)
    } else {
        &base64_data
    };

    let bytes = STANDARD
        .decode(data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Determine file path
    let base = Path::new(&base_path);
    let base_dir = base.parent().unwrap_or(base);

    // Create images directory if it doesn't exist
    let images_dir = base_dir.join("images");
    if !images_dir.exists() {
        fs::create_dir_all(&images_dir).map_err(|e| format!("Failed to create images dir: {}", e))?;
    }

    // Generate filename
    let file_name = filename.unwrap_or_else(|| {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        format!("pasted-image-{}.png", timestamp)
    });

    let file_path = images_dir.join(&file_name);

    // Write file
    fs::write(&file_path, bytes).map_err(|e| format!("Failed to write image: {}", e))?;

    // Return relative path
    Ok(format!("images/{}", file_name))
}

/// Installs the 'mkv' command in PATH (/usr/local/bin)
/// This allows users to open files/folders from terminal with: mkv <path>
#[command]
pub fn install_cli_command() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let script_content = r#"#!/bin/bash
if [ -z "$1" ]; then
  open /Applications/MarkViewer.app
else
  # Convert to absolute path
  if [[ "$1" = /* ]]; then
    ABS_PATH="$1"
  else
    ABS_PATH="$(cd "$(dirname "$1")" 2>/dev/null && pwd)/$(basename "$1")"
  fi
  open /Applications/MarkViewer.app --args "$ABS_PATH"
fi
"#;

        let script_path = "/usr/local/bin/mkv";

        // Use osascript to run with admin privileges
        let apple_script = format!(
            r#"do shell script "echo '{}' > {} && chmod +x {}" with administrator privileges"#,
            script_content.replace("\"", "\\\"").replace("\n", "\\n"),
            script_path,
            script_path
        );

        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(&apple_script)
            .output()
            .map_err(|e| format!("Failed to run installer: {}", e))?;

        if output.status.success() {
            Ok("Comando 'mkv' instalado com sucesso! Agora você pode usar:\n\n  mkv .          - Abrir pasta atual\n  mkv arquivo.md - Abrir arquivo\n  mkv            - Abrir MarkViewer".to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if stderr.contains("User canceled") || stderr.contains("canceled") {
                Err("Instalação cancelada pelo usuário.".to_string())
            } else {
                Err(format!("Falha ao instalar: {}", stderr))
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let script_content = r#"#!/bin/bash
if [ -z "$1" ]; then
  markviewer
else
  if [[ "$1" = /* ]]; then
    ABS_PATH="$1"
  else
    ABS_PATH="$(cd "$(dirname "$1")" 2>/dev/null && pwd)/$(basename "$1")"
  fi
  markviewer "$ABS_PATH"
fi
"#;
        let script_path = "/usr/local/bin/mkv";

        let output = std::process::Command::new("pkexec")
            .arg("bash")
            .arg("-c")
            .arg(format!("echo '{}' > {} && chmod +x {}", script_content, script_path, script_path))
            .output()
            .map_err(|e| format!("Failed to run installer: {}", e))?;

        if output.status.success() {
            Ok("Comando 'mkv' instalado com sucesso!".to_string())
        } else {
            Err(format!("Falha ao instalar: {}", String::from_utf8_lossy(&output.stderr)))
        }
    }

    #[cfg(target_os = "windows")]
    {
        Err("Instalação automática não suportada no Windows ainda. Adicione o executável ao PATH manualmente.".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_markdown_basic() {
        let md = "# Hello\n\nThis is **bold**.";
        let options = RenderOptions {
            theme: "light".to_string(),
            base_path: None,
        };

        let result = render_markdown(md.to_string(), options).unwrap();

        assert!(result.html.contains("<h1"));
        assert!(result.html.contains("<strong>bold</strong>"));
        assert!(result.special_blocks.is_empty());
    }

    #[test]
    fn test_render_markdown_with_mermaid() {
        let md = "# Title\n\n```mermaid\ngraph TD\n    A --> B\n```";
        let options = RenderOptions {
            theme: "light".to_string(),
            base_path: None,
        };

        let result = render_markdown(md.to_string(), options).unwrap();

        assert_eq!(result.special_blocks.len(), 1);
        assert_eq!(result.special_blocks[0].block_type, "mermaid");
        assert!(result.html.contains("special-block"));
    }

    #[test]
    fn test_highlight_code_block() {
        let code = "fn main() {}";
        let result = highlight_code_block(code.to_string(), "rust".to_string());

        assert!(result.contains("span"));
    }
}
