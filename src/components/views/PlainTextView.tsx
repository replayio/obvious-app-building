import { FileText } from "lucide-react";

export function PlainTextView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <FileText className="h-10 w-10" />
      <p className="text-lg font-medium">Plain Text View</p>
      <p className="text-sm">Coming soon</p>
    </div>
  );
}

