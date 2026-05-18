// --- Core entity types ---

export interface Book {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  bookId: string;
  title: string;
  viewType: ViewType;
  content: PageContent;
  createdAt: string;
  updatedAt: string;
}

export type ViewType =
  | "plain-text"
  | "rich-text"
  | "checklist"
  | "table"
  | "kanban";

// --- Content variants (discriminated union by type) ---

export type PageContent =
  | PlainTextContent
  | RichTextContent
  | ChecklistContent
  | TableContent
  | KanbanContent;

export interface PlainTextContent {
  type: "plain-text";
  text: string;
}

export interface RichTextContent {
  type: "rich-text";
  json: unknown; // Tiptap JSONContent — typed properly when Tiptap is installed
}

export interface ChecklistContent {
  type: "checklist";
  items: ChecklistItem[];
}

export interface TableContent {
  type: "table";
  columns: TableColumn[];
  rows: TableRow[];
}

export interface KanbanContent {
  type: "kanban";
  columns: KanbanColumn[];
}

// --- Nested types ---

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface TableColumn {
  id: string;
  name: string;
}

export interface TableRow {
  id: string;
  cells: Record<string, string>; // columnId → value
}

export interface KanbanColumn {
  id: string;
  name: string;
  cards: KanbanCard[];
}

export interface KanbanCard {
  id: string;
  text: string;
}

// --- Application state ---

export interface AppState {
  books: Book[];
  pages: Page[];
  activeBookId: string | null;
  activePageId: string | null;
}

// --- View metadata ---

export const VIEW_TYPES: { value: ViewType; label: string }[] = [
  { value: "plain-text", label: "Plain Text" },
  { value: "rich-text", label: "Rich Text" },
  { value: "checklist", label: "Checklist" },
  { value: "table", label: "Table" },
  { value: "kanban", label: "Kanban" },
];

