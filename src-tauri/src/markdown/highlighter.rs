use once_cell::sync::Lazy;
use syntect::highlighting::ThemeSet;
use syntect::html::{ClassStyle, ClassedHTMLGenerator};
use syntect::parsing::SyntaxSet;
use syntect::util::LinesWithEndings;

/// Lazy-loaded syntax set (expensive to create)
static SYNTAX_SET: Lazy<SyntaxSet> = Lazy::new(SyntaxSet::load_defaults_newlines);

/// Lazy-loaded theme set
static THEME_SET: Lazy<ThemeSet> = Lazy::new(ThemeSet::load_defaults);

/// Highlights code using syntect with CSS classes
///
/// Uses class-based highlighting (prefix: "hl-") so themes can be switched
/// via CSS without re-rendering the HTML.
pub fn highlight_code(code: &str, lang: &str) -> String {
    let syntax = SYNTAX_SET
        .find_syntax_by_token(lang)
        .or_else(|| SYNTAX_SET.find_syntax_by_extension(lang))
        .unwrap_or_else(|| SYNTAX_SET.find_syntax_plain_text());

    let mut html_generator =
        ClassedHTMLGenerator::new_with_class_style(syntax, &SYNTAX_SET, ClassStyle::Spaced);

    for line in LinesWithEndings::from(code) {
        let _ = html_generator.parse_html_for_line_which_includes_newline(line);
    }

    html_generator.finalize()
}

/// Returns CSS for syntax highlighting (light theme)
pub fn get_highlight_css_light() -> &'static str {
    r#"
/* Syntect highlight classes - Light theme */
.hljs { color: #24292e; }
.hljs-keyword, .hljs-selector-tag, .hljs-type { color: #d73a49; }
.hljs-string, .hljs-attribute { color: #032f62; }
.hljs-comment, .hljs-quote { color: #6a737d; font-style: italic; }
.hljs-function, .hljs-title { color: #6f42c1; }
.hljs-number, .hljs-literal { color: #005cc5; }
.hljs-operator { color: #d73a49; }
.hljs-variable, .hljs-template-variable { color: #e36209; }
.hljs-built_in { color: #005cc5; }
.hljs-symbol { color: #6f42c1; }
.hljs-meta { color: #6a737d; }
.hljs-params { color: #24292e; }
.hljs-class .hljs-title { color: #6f42c1; }
.hljs-doctag { color: #d73a49; }
.hljs-regexp { color: #032f62; }
.hljs-section { color: #005cc5; font-weight: bold; }
.hljs-addition { color: #22863a; background: #f0fff4; }
.hljs-deletion { color: #b31d28; background: #ffeef0; }
"#
}

/// Returns CSS for syntax highlighting (dark theme)
pub fn get_highlight_css_dark() -> &'static str {
    r#"
/* Syntect highlight classes - Dark theme */
.dark .hljs { color: #e1e4e8; }
.dark .hljs-keyword, .dark .hljs-selector-tag, .dark .hljs-type { color: #ff7b72; }
.dark .hljs-string, .dark .hljs-attribute { color: #a5d6ff; }
.dark .hljs-comment, .dark .hljs-quote { color: #8b949e; font-style: italic; }
.dark .hljs-function, .dark .hljs-title { color: #d2a8ff; }
.dark .hljs-number, .dark .hljs-literal { color: #79c0ff; }
.dark .hljs-operator { color: #ff7b72; }
.dark .hljs-variable, .dark .hljs-template-variable { color: #ffa657; }
.dark .hljs-built_in { color: #79c0ff; }
.dark .hljs-symbol { color: #d2a8ff; }
.dark .hljs-meta { color: #8b949e; }
.dark .hljs-params { color: #e1e4e8; }
.dark .hljs-class .hljs-title { color: #d2a8ff; }
.dark .hljs-doctag { color: #ff7b72; }
.dark .hljs-regexp { color: #a5d6ff; }
.dark .hljs-section { color: #79c0ff; font-weight: bold; }
.dark .hljs-addition { color: #7ee787; background: rgba(46, 160, 67, 0.15); }
.dark .hljs-deletion { color: #ffa198; background: rgba(248, 81, 73, 0.15); }
"#
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_highlight_rust() {
        let code = "fn main() {\n    println!(\"Hello\");\n}";
        let html = highlight_code(code, "rust");
        assert!(html.contains("span"));
        assert!(html.contains("fn"));
    }

    #[test]
    fn test_highlight_unknown_lang() {
        let code = "some text";
        let html = highlight_code(code, "unknown_lang_xyz");
        // Should fallback to plain text
        assert!(html.contains("some text"));
    }

    #[test]
    fn test_highlight_javascript() {
        let code = "const x = 42;";
        let html = highlight_code(code, "js");
        assert!(html.contains("span"));
    }
}
