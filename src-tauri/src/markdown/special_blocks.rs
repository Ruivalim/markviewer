use serde::{Deserialize, Serialize};

/// Represents a special block (mermaid diagram or chart) extracted from markdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpecialBlock {
    /// Type of block: "mermaid" or "chart"
    pub block_type: String,
    /// The content inside the code fence
    pub content: String,
    /// Unique ID for the placeholder div
    pub placeholder_id: String,
}

/// Extracts special blocks (mermaid, chart) from markdown and replaces them with placeholders.
///
/// Returns a tuple of (modified_markdown, special_blocks).
/// The modified markdown has the special blocks replaced with placeholder divs
/// that will be filled in by JavaScript on the frontend.
pub fn extract_special_blocks(markdown: &str) -> (String, Vec<SpecialBlock>) {
    let mut blocks = Vec::new();
    let mut result = String::new();
    let mut in_code_block = false;
    let mut code_fence = String::new(); // Store the fence type (``` or ~~~)
    let mut code_lang = String::new();
    let mut code_content = String::new();
    let mut block_counter = 0;

    for line in markdown.lines() {
        let trimmed = line.trim_start();

        // Check for code fence start/end (``` or ~~~)
        let is_backtick_fence = trimmed.starts_with("```");
        let is_tilde_fence = trimmed.starts_with("~~~");

        if is_backtick_fence || is_tilde_fence {
            let fence = if is_backtick_fence { "```" } else { "~~~" };

            if in_code_block && trimmed.starts_with(&code_fence) {
                // End of code block (matching fence type)
                let lang_lower = code_lang.to_lowercase();
                if lang_lower == "mermaid" || lang_lower == "chart" {
                    let placeholder_id = format!("special-block-{}", block_counter);
                    block_counter += 1;

                    blocks.push(SpecialBlock {
                        block_type: lang_lower.clone(),
                        content: code_content.trim().to_string(),
                        placeholder_id: placeholder_id.clone(),
                    });

                    // Insert a placeholder div that will be found and rendered by JS
                    result.push_str(&format!(
                        "<div class=\"special-block {}\" id=\"{}\" data-block-type=\"{}\"></div>\n",
                        lang_lower, placeholder_id, lang_lower
                    ));
                } else {
                    // Regular code block - keep for comrak to process
                    result.push_str(&format!("{}{}\n", code_fence, code_lang));
                    result.push_str(&code_content);
                    result.push_str(&format!("{}\n", code_fence));
                }
                in_code_block = false;
                code_fence.clear();
                code_lang.clear();
                code_content.clear();
            } else if !in_code_block {
                // Start of code block
                in_code_block = true;
                code_fence = fence.to_string();
                // Extract language after the fence
                code_lang = trimmed[3..].trim().to_string();
            } else {
                // Inside a code block but different fence type - treat as content
                code_content.push_str(line);
                code_content.push('\n');
            }
        } else if in_code_block {
            code_content.push_str(line);
            code_content.push('\n');
        } else {
            result.push_str(line);
            result.push('\n');
        }
    }

    // Handle unclosed code block (shouldn't happen in valid markdown)
    if in_code_block {
        result.push_str(&format!("{}{}\n", code_fence, code_lang));
        result.push_str(&code_content);
    }

    (result, blocks)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_mermaid() {
        let md = r#"# Title

Some text.

```mermaid
flowchart TD
    A --> B
```

More text.
"#;
        let (result, blocks) = extract_special_blocks(md);

        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].block_type, "mermaid");
        assert!(blocks[0].content.contains("flowchart TD"));
        assert!(result.contains("special-block-0"));
        assert!(result.contains("data-block-type=\"mermaid\""));
    }

    #[test]
    fn test_extract_chart() {
        let md = r#"```chart
{"type": "bar", "data": {}}
```"#;
        let (result, blocks) = extract_special_blocks(md);

        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].block_type, "chart");
        assert!(blocks[0].content.contains("type"));
    }

    #[test]
    fn test_preserve_regular_code() {
        let md = r#"```rust
fn main() {}
```"#;
        let (result, blocks) = extract_special_blocks(md);

        assert_eq!(blocks.len(), 0);
        assert!(result.contains("```rust"));
        assert!(result.contains("fn main()"));
    }

    #[test]
    fn test_multiple_special_blocks() {
        let md = r#"```mermaid
graph LR
```

```chart
{}
```

```mermaid
pie
```"#;
        let (result, blocks) = extract_special_blocks(md);

        assert_eq!(blocks.len(), 3);
        assert_eq!(blocks[0].placeholder_id, "special-block-0");
        assert_eq!(blocks[1].placeholder_id, "special-block-1");
        assert_eq!(blocks[2].placeholder_id, "special-block-2");
    }

    #[test]
    fn test_case_insensitive() {
        let md = r#"```MERMAID
graph
```

```Chart
{}
```"#;
        let (_, blocks) = extract_special_blocks(md);

        assert_eq!(blocks.len(), 2);
        assert_eq!(blocks[0].block_type, "mermaid");
        assert_eq!(blocks[1].block_type, "chart");
    }
}
