export interface FileDiff {
  path: string;
  content: string;
  additions: number;
  deletions: number;
}

export function parseDiff(diff: string): FileDiff[] {
  if (!diff.trim()) return [];

  const sections = diff.split(/(?=^diff --git )/m).filter(Boolean);

  return sections.map((section) => {
    const match = section.match(/^diff --git a\/(.+?) b\/(.+?)$/m);
    const path = match ? match[2] : "unknown file";
    const lines = section.split("\n");
    const additions = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
    const deletions = lines.filter((l) => l.startsWith("-") && !l.startsWith("---")).length;
    return { path, content: section, additions, deletions };
  });
}

export type DiffLineKind = "add" | "remove" | "meta" | "context";

export function classifyDiffLine(line: string): DiffLineKind {
  if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff --git") || line.startsWith("index ")) {
    return "meta";
  }
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "remove";
  return "context";
}
