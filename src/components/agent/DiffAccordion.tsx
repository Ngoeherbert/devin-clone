import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseDiff, classifyDiffLine } from "@/lib/diff";

export function DiffAccordion({ diff }: { diff: string }) {
  const files = parseDiff(diff);
  const [openPath, setOpenPath] = useState<string | null>(files[0]?.path ?? null);

  if (files.length === 0) {
    return <p className="text-text-secondary">No diff yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {files.map((file) => {
        const isOpen = openPath === file.path;
        return (
          <div key={file.path} className="rounded-md border border-border">
            <button
              onClick={() => setOpenPath(isOpen ? null : file.path)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left"
            >
              <FileText className="size-3.5 shrink-0 text-text-secondary" />
              <span className="flex-1 truncate text-[12.5px] text-text-primary">{file.path}</span>
              <span className="text-[11px] text-text-success">+{file.additions}</span>
              <span className="text-[11px] text-text-danger">-{file.deletions}</span>
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-text-secondary transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </button>
            {isOpen && (
              <div className="overflow-x-auto border-t border-border">
                {file.content.split("\n").map((line, i) => {
                  const kind = classifyDiffLine(line);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "whitespace-pre px-3 py-[1px] text-[11.5px]",
                        kind === "add" && "bg-bg-success text-text-success",
                        kind === "remove" && "bg-bg-danger text-text-danger",
                        kind === "meta" && "text-text-muted",
                        kind === "context" && "text-text-secondary"
                      )}
                    >
                      {line || " "}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
