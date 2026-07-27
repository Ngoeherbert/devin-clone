import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <div className="border-t border-border bg-surface-1 px-6 py-14 text-center">
      <p className="mb-1.5 text-lg font-medium">Ready to ship faster</p>
      <p className="mb-4 text-[13px] text-text-secondary">
        Free to start. No credit card required.
      </p>
      <Button asChild className="px-4">
        <Link to="/signup">Get started</Link>
      </Button>
    </div>
  );
}
