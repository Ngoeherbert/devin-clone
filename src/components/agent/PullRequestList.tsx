import { useEffect, useState } from "react";
import { ExternalLink, GitMerge, GitPullRequest, CircleDot } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface PullRequestSummary {
  number: number;
  title: string;
  state: "open" | "closed";
  merged: boolean;
  url: string;
  author: string | null;
  updatedAt: string;
}

export function PullRequestList({ chatId }: { chatId: string }) {
  const [prs, setPrs] = useState<PullRequestSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PullRequestSummary[]>(`/api/chats/${chatId}/pull-requests`)
      .then((rows) => !cancelled && setPrs(rows))
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load pull requests.");
      });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  if (error) return <p className="text-text-secondary">{error}</p>;
  if (prs === null) return <p className="text-text-secondary">Loading pull requests…</p>;
  if (prs.length === 0) {
    return (
      <p className="text-text-secondary">
        No pull requests found for this repo (or no repo/GITHUB_TOKEN configured for this run).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {prs.map((pr) => (
        <a
          key={pr.number}
          href={pr.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2 no-underline hover:bg-surface-1"
        >
          {pr.merged ? (
            <GitMerge className="size-3.5 shrink-0 text-text-accent" />
          ) : pr.state === "open" ? (
            <CircleDot className="size-3.5 shrink-0 text-text-success" />
          ) : (
            <GitPullRequest className="size-3.5 shrink-0 text-text-muted" />
          )}
          <span className="flex-1 truncate text-[12.5px] text-text-primary">
            #{pr.number} {pr.title}
          </span>
          <Badge variant={pr.merged ? "accent" : pr.state === "open" ? "success" : "default"}>
            {pr.merged ? "merged" : pr.state}
          </Badge>
          <ExternalLink className="size-3 shrink-0 text-text-muted" />
        </a>
      ))}
    </div>
  );
}
