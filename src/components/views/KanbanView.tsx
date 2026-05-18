import { Columns3 } from "lucide-react";

export function KanbanView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Columns3 className="h-10 w-10" />
      <p className="text-lg font-medium">Kanban View</p>
      <p className="text-sm">Coming soon</p>
    </div>
  );
}

