import { Link } from "react-router-dom";
import { Sparkles, Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <div className="px-6 pb-16 pt-16 text-center">
      <div className="mx-auto mb-5 inline-flex items-center gap-1.5 rounded-md bg-bg-accent px-3 py-1 text-xs text-text-accent">
        <Sparkles className="size-3.5" />
        Now with canvas and design workspaces
      </div>

      <h1 className="mx-auto mb-3.5 max-w-2xl text-[34px] font-medium leading-tight">
        The AI teammate that ships
      </h1>
      <p className="mx-auto mb-7 max-w-md text-[15px] leading-relaxed text-text-secondary">
        Assign a task, sketch a diagram, or design a screen. One workspace
        that plans, builds, and ships alongside you.
      </p>

      <div className="mb-10 flex justify-center gap-2.5">
        <Button asChild size="default" className="px-4">
          <Link to="/signup">
            Start for free
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
        <Button variant="outline" className="px-4">
          Watch demo
          <Play className="size-3.5" />
        </Button>
      </div>

      <div className="mx-auto max-w-[560px] rounded-xl border border-border bg-surface-1 p-3 text-left">
        <div className="mb-2.5 flex gap-1.5">
          <span className="size-2 rounded-full bg-border-strong" />
          <span className="size-2 rounded-full bg-border-strong" />
          <span className="size-2 rounded-full bg-border-strong" />
        </div>
        <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5 font-mono text-[12.5px] text-text-secondary">
          Fix the failing checkout tests and open a PR
        </div>
      </div>
    </div>
  );
}
