import type { Page } from "@/types";
import { PlainTextView } from "@/components/views/PlainTextView";
import { RichTextView } from "@/components/views/RichTextView";
import { ChecklistView } from "@/components/views/ChecklistView";
import { TableView } from "@/components/views/TableView";
import { KanbanView } from "@/components/views/KanbanView";

interface PageContentProps {
  page: Page;
}

const VIEW_COMPONENTS: Record<Page["viewType"], React.ComponentType<{ page: Page }>> = {
  "plain-text": PlainTextView,
  "rich-text": RichTextView,
  checklist: ChecklistView,
  table: TableView,
  kanban: KanbanView,
};

export function PageContent({ page }: PageContentProps) {
  const View = VIEW_COMPONENTS[page.viewType];
  return (
    <div className="flex flex-1 overflow-auto p-6">
      {/* key resets view-local state when the active page changes */}
      <View key={page.id} page={page} />
    </div>
  );
}
