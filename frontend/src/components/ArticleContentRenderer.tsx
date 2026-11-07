import React from "react";

interface Props {
  content?: string;
  style?: React.CSSProperties;
}

// Helper to parse inline **bold text**
const renderInlineFormatting = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} style={{ color: "#111827", fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

export const ArticleContentRenderer: React.FC<Props> = ({ content = "", style }) => {
  if (!content || !content.trim()) {
    return <div style={{ color: "#9ca3af", fontStyle: "italic" }}>Chưa có nội dung bài viết.</div>;
  }

  // Split content into major blocks by double newlines or multiple newlines
  const blocks = content.split(/\n\s*\n/);

  return (
    <div
      className="article-content-body"
      style={{
        fontSize: 16,
        lineHeight: 1.85,
        color: "#374151",
        ...style,
      }}
    >
      {blocks.map((block, blockIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Heading 2: ## Title
        if (trimmed.startsWith("## ")) {
          const headingText = trimmed.replace(/^##\s+/, "");
          return (
            <h2
              key={blockIdx}
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#111827",
                marginTop: blockIdx === 0 ? 0 : 32,
                marginBottom: 14,
                borderLeft: "4px solid #cb1c22",
                paddingLeft: 12,
                lineHeight: 1.4,
              }}
            >
              {renderInlineFormatting(headingText)}
            </h2>
          );
        }

        // Heading 3: ### Title
        if (trimmed.startsWith("### ")) {
          const headingText = trimmed.replace(/^###\s+/, "");
          return (
            <h3
              key={blockIdx}
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#1f2937",
                marginTop: 24,
                marginBottom: 10,
                lineHeight: 1.4,
              }}
            >
              {renderInlineFormatting(headingText)}
            </h3>
          );
        }

        // Single # Heading fallback
        if (trimmed.startsWith("# ")) {
          const headingText = trimmed.replace(/^#\s+/, "");
          return (
            <h2
              key={blockIdx}
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "#111827",
                marginTop: 28,
                marginBottom: 14,
                lineHeight: 1.4,
              }}
            >
              {renderInlineFormatting(headingText)}
            </h2>
          );
        }

        // List item block: lines starting with `- ` or `* `
        const lines = trimmed.split("\n");
        const isBulletList = lines.every((line) => line.trim().startsWith("- ") || line.trim().startsWith("* "));

        if (isBulletList) {
          return (
            <ul
              key={blockIdx}
              style={{
                margin: "16px 0 20px 24px",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {lines.map((line, lineIdx) => {
                const itemText = line.trim().replace(/^[-*]\s+/, "");
                return (
                  <li
                    key={lineIdx}
                    style={{
                      lineHeight: 1.75,
                      color: "#374151",
                    }}
                  >
                    {renderInlineFormatting(itemText)}
                  </li>
                );
              })}
            </ul>
          );
        }

        // Regular paragraph
        return (
          <p
            key={blockIdx}
            style={{
              marginBottom: 18,
              textAlign: "justify",
            }}
          >
            {renderInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export default ArticleContentRenderer;

