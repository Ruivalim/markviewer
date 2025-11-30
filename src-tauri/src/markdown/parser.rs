use comrak::Options;

use super::highlighter::highlight_code;

/// Creates comrak options with GFM extensions enabled
fn get_options() -> Options {
    let mut options = Options::default();

    // Extension options (GFM features)
    options.extension.strikethrough = true;
    options.extension.tagfilter = false; // Don't filter HTML tags (we need them for special blocks)
    options.extension.table = true;
    options.extension.autolink = true;
    options.extension.tasklist = true;
    options.extension.superscript = true;
    options.extension.header_ids = Some("heading-".to_string());
    options.extension.footnotes = true;
    options.extension.description_lists = true;
    options.extension.front_matter_delimiter = Some("---".to_string());
    options.extension.shortcodes = true;

    // Render options
    options.render.unsafe_ = true; // Allow raw HTML in markdown
    options.render.github_pre_lang = true;
    options.render.full_info_string = true;

    options
}

/// Custom syntax highlighter adapter for comrak
pub struct SyntectAdapter;

impl comrak::adapters::SyntaxHighlighterAdapter for SyntectAdapter {
    fn write_highlighted(
        &self,
        output: &mut dyn std::io::Write,
        lang: Option<&str>,
        code: &str,
    ) -> std::io::Result<()> {
        let lang = lang.unwrap_or("text");
        let highlighted = highlight_code(code, lang);
        write!(output, "{}", highlighted)
    }

    fn write_pre_tag(
        &self,
        output: &mut dyn std::io::Write,
        attributes: std::collections::HashMap<String, String>,
    ) -> std::io::Result<()> {
        let mut attrs_str = String::new();
        for (key, value) in attributes {
            attrs_str.push_str(&format!(" {}=\"{}\"", key, value));
        }
        write!(output, "<pre{}>", attrs_str)
    }

    fn write_code_tag(
        &self,
        output: &mut dyn std::io::Write,
        attributes: std::collections::HashMap<String, String>,
    ) -> std::io::Result<()> {
        let mut attrs_str = String::new();
        for (key, value) in attributes {
            attrs_str.push_str(&format!(" {}=\"{}\"", key, value));
        }
        write!(output, "<code{}>", attrs_str)
    }
}

/// Renders markdown to HTML with syntax highlighting
pub fn render_markdown_html(markdown: &str) -> String {
    let options = get_options();

    // Set up syntax highlighting plugin
    let adapter = SyntectAdapter;
    let mut plugins = comrak::Plugins::default();
    plugins.render.codefence_syntax_highlighter = Some(&adapter);

    comrak::markdown_to_html_with_plugins(markdown, &options, &plugins)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_markdown() {
        let md = "# Hello\n\nThis is **bold** and *italic*.";
        let html = render_markdown_html(md);
        assert!(html.contains("<h1"));
        assert!(html.contains("<strong>bold</strong>"));
        assert!(html.contains("<em>italic</em>"));
    }

    #[test]
    fn test_table() {
        let md = "| A | B |\n|---|---|\n| 1 | 2 |";
        let html = render_markdown_html(md);
        assert!(html.contains("<table>"));
        assert!(html.contains("<th>"));
    }

    #[test]
    fn test_tasklist() {
        let md = "- [ ] Todo\n- [x] Done";
        let html = render_markdown_html(md);
        assert!(html.contains("type=\"checkbox\""));
    }

    #[test]
    fn test_code_block() {
        let md = "```rust\nfn main() {}\n```";
        let html = render_markdown_html(md);
        assert!(html.contains("<pre"));
        assert!(html.contains("<code"));
    }
}
