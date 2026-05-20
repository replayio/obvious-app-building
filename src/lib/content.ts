import type { PageContent, ViewType } from "@/types";

/** Return empty default content for a given view type. */
export function defaultContent(viewType: ViewType): PageContent {
  switch (viewType) {
    case "plain-text":
      return { type: "plain-text", text: "" };
    case "rich-text":
      return { type: "rich-text", json: null };
    case "checklist":
      return { type: "checklist", items: [] };
    case "table":
      return { type: "table", columns: [], rows: [] };
    case "kanban":
      return { type: "kanban", columns: [] };
  }
}

/**
 * Best-effort content conversion when switching view types.
 * Falls back to defaultContent for incompatible conversions.
 */
export function convertContent(
  current: PageContent,
  target: ViewType,
): PageContent {
  if (current.type === target) return current;

  // plain-text → rich-text: wrap in a paragraph
  if (current.type === "plain-text" && target === "rich-text") {
    return {
      type: "rich-text",
      json: current.text
        ? {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: current.text }],
              },
            ],
          }
        : null,
    };
  }

  // rich-text → plain-text: extract text nodes
  if (current.type === "rich-text" && target === "plain-text") {
    return { type: "plain-text", text: extractText(current.json) };
  }

  return defaultContent(target);
}

/** Recursively extract text from a Tiptap JSON doc. */
function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (Array.isArray(n.content)) {
    return (n.content as unknown[])
      .map(extractText)
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

