import { CheckSquare } from "lucide-react";
import type { Page } from "@/types";

export function ChecklistView({ page: _ }: { page: Page }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <CheckSquare className="h-10 w-10" />
      <p className="text-lg font-medium">Checklist View</p>
      <p className="text-sm">Coming soon</p>
    </div>
  );
}

