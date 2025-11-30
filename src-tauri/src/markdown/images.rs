use regex::Regex;
use std::path::Path;

/// Resolves image paths in HTML to absolute file:// URIs.
///
/// - HTTP/HTTPS URLs are passed through unchanged
/// - Data URIs are passed through unchanged
/// - Absolute paths are converted to file:// URIs
/// - Relative paths are resolved against the base_path (directory of the .md file)
pub fn resolve_image_paths(html: &str, base_path: &str) -> String {
    let img_regex = Regex::new(r#"<img\s+([^>]*?)src="([^"]+)"([^>]*)>"#).unwrap();

    img_regex
        .replace_all(html, |caps: &regex::Captures| {
            let before = &caps[1];
            let src = &caps[2];
            let after = &caps[3];

            let resolved_src = resolve_single_path(src, base_path);

            // Ensure self-closing tag
            let after_clean = after.trim_end_matches('/').trim();
            if after_clean.is_empty() {
                format!("<img {}src=\"{}\" />", before, resolved_src)
            } else {
                format!("<img {}src=\"{}\" {} />", before, resolved_src, after_clean)
            }
        })
        .to_string()
}

/// Resolves a single image path to absolute path (not file:// URI)
/// The frontend will convert to asset:// using Tauri's convertFileSrc
fn resolve_single_path(src: &str, base_path: &str) -> String {
    // Already an absolute URL
    if src.starts_with("http://") || src.starts_with("https://") {
        return src.to_string();
    }

    // Data URI - pass through
    if src.starts_with("data:") {
        return src.to_string();
    }

    // Asset protocol - pass through (already converted by frontend)
    if src.starts_with("asset://") {
        return src.to_string();
    }

    // Already a file:// URI - extract path
    if src.starts_with("file://") {
        return src[7..].to_string();
    }

    // Absolute path (Unix style) - return as-is with marker
    if src.starts_with('/') {
        return format!("__LOCAL_FILE__:{}", src);
    }

    // Windows absolute path (e.g., C:\...)
    if src.len() >= 2 && src.chars().nth(1) == Some(':') {
        return format!("__LOCAL_FILE__:{}", src.replace('\\', "/"));
    }

    // Relative path - resolve against base directory
    let base = Path::new(base_path);
    let base_dir = base.parent().unwrap_or(base);
    let resolved = base_dir.join(src);

    // Try to canonicalize, fall back to joined path
    let final_path = resolved
        .canonicalize()
        .unwrap_or(resolved)
        .display()
        .to_string();

    format!("__LOCAL_FILE__:{}", final_path)
}

/// Resolves markdown image syntax ![alt](src) paths before rendering
/// This is called before comrak to ensure relative paths work
pub fn resolve_markdown_image_paths(markdown: &str, base_path: &str) -> String {
    let img_regex = Regex::new(r"!\[([^\]]*)\]\(([^)]+)\)").unwrap();

    img_regex
        .replace_all(markdown, |caps: &regex::Captures| {
            let alt = &caps[1];
            let src = &caps[2];
            let resolved_src = resolve_single_path(src, base_path);
            format!("![{}]({})", alt, resolved_src)
        })
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_http_url_passthrough() {
        let html = r#"<img src="https://example.com/img.png">"#;
        let result = resolve_image_paths(html, "/some/path/file.md");
        assert!(result.contains("https://example.com/img.png"));
    }

    #[test]
    fn test_data_uri_passthrough() {
        let html = r#"<img src="data:image/png;base64,ABC123">"#;
        let result = resolve_image_paths(html, "/some/path/file.md");
        assert!(result.contains("data:image/png;base64,ABC123"));
    }

    #[test]
    fn test_absolute_path() {
        let html = r#"<img src="/Users/test/photo.png">"#;
        let result = resolve_image_paths(html, "/some/path/file.md");
        assert!(result.contains("file:///Users/test/photo.png"));
    }

    #[test]
    fn test_relative_path() {
        let html = r#"<img src="./images/photo.png">"#;
        let result = resolve_image_paths(html, "/some/path/file.md");
        // Should resolve to /some/path/images/photo.png
        assert!(result.contains("file://"));
        assert!(result.contains("images/photo.png") || result.contains("images%2Fphoto.png"));
    }

    #[test]
    fn test_multiple_images() {
        let html = r#"<img src="a.png"><img src="b.png">"#;
        let result = resolve_image_paths(html, "/path/file.md");
        assert!(result.contains("file://"));
        // Both should be resolved
        let count = result.matches("file://").count();
        assert_eq!(count, 2);
    }

    #[test]
    fn test_markdown_image_resolution() {
        let md = "![Alt text](./img/photo.png)";
        let result = resolve_markdown_image_paths(md, "/path/to/file.md");
        assert!(result.contains("file://"));
    }

    #[test]
    fn test_preserves_alt_text() {
        let md = "![My Photo](photo.png)";
        let result = resolve_markdown_image_paths(md, "/path/file.md");
        assert!(result.contains("![My Photo]"));
    }
}
