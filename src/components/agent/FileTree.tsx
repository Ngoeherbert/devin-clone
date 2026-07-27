import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, ChevronLeft, Folder, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
  content?: string;
  truncated?: boolean;
}

function findFirstFile(nodes: FileNode[]): FileNode | null {
  for (const node of nodes) {
    if (node.type === "file") return node;
    if (node.children) {
      const found = findFirstFile(node.children);
      if (found) return found;
    }
  }
  return null;
}

function allDirPaths(nodes: FileNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.type === "dir") {
      paths.push(node.path);
      if (node.children) paths.push(...allDirPaths(node.children));
    }
  }
  return paths;
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  selectedPath,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  selectedPath: string | null;
  onSelect: (node: FileNode) => void;
}) {
  const pad = 8 + depth * 14;

  if (node.type === "dir") {
    const isOpen = expanded.has(node.path);
    return (
      <div>
        <button
          onClick={() => onToggle(node.path)}
          style={{ paddingLeft: pad }}
          className="flex w-full items-center gap-1.5 py-1 text-left text-[12.5px] text-text-secondary hover:bg-surface-2"
        >
          {isOpen ? (
            <ChevronDown className="size-3.5 shrink-0" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0" />
          )}
          <Folder className="size-3.5 shrink-0 text-text-accent" />
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen &&
          node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node)}
      style={{ paddingLeft: pad + 18 }}
      className={cn(
        "flex w-full items-center gap-1.5 py-1 text-left text-[12.5px] hover:bg-surface-2",
        selectedPath === node.path
          ? "bg-bg-accent text-text-accent"
          : "text-text-secondary"
      )}
    >
      <FileText className="size-3.5 shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({ files }: { files: FileNode[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(allDirPaths(files)));
  const [selected, setSelected] = useState<FileNode | null>(() => findFirstFile(files));

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const lineCount = useMemo(
    () => (selected?.content ? selected.content.split("\n").length : 0),
    [selected]
  );

  if (files.length === 0) {
    return <p className="text-text-secondary">No files yet — run the agent to see the workspace here.</p>;
  }

  return (
    <div className="flex h-full">
      <div
        className={cn(
          "w-full shrink-0 overflow-y-auto border-r border-border py-1.5 sm:block sm:w-[220px]",
          selected ? "hidden" : "block"
        )}
      >
        {files.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            selectedPath={selected?.path ?? null}
            onSelect={setSelected}
          />
        ))}
      </div>
      <div className={cn("flex-1 overflow-auto", selected ? "block" : "hidden sm:block")}>
        {selected ? (
          <>
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-[11.5px] text-text-muted">
              <button
                onClick={() => setSelected(null)}
                aria-label="Back to files"
                className="-ml-1 flex items-center gap-1 rounded px-1 py-0.5 hover:bg-surface-2 sm:hidden"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="truncate">
                {selected.path}
                {selected.truncated && " (truncated — too large to preview)"}
              </span>
            </div>
            {selected.content !== undefined ? (
              <div className="flex text-[11.5px]">
                <div className="select-none border-r border-border px-2 py-2 text-right text-text-muted">
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <pre className="flex-1 overflow-x-auto px-3 py-2 text-text-primary">
                  {selected.content}
                </pre>
              </div>
            ) : (
              <p className="p-3 text-text-secondary">
                {selected.truncated ? "File too large to preview." : "Binary file — can't preview."}
              </p>
            )}
          </>
        ) : (
          <p className="hidden p-3 text-text-secondary sm:block">Select a file to view it.</p>
        )}
      </div>
    </div>
  );
}
