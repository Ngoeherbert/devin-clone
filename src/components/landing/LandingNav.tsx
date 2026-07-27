import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  return (
    <div className="flex items-center px-6 py-3.5 border-b border-border">
      <Link to="/" className="flex items-center gap-2 text-sm font-medium">
        <span className="flex size-[22px] items-center justify-center rounded-md bg-text-primary">
          <Zap className="size-[13px] text-surface-2" />
        </span>
        Omni
      </Link>

      <div className="ml-10 hidden gap-6 text-[13px] text-text-secondary sm:flex">
        <a href="#features">Product</a>
        <a href="#pricing">Pricing</a>
        <a href="#faq">FAQ</a>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <Button asChild size="sm" variant="ghost">
          <Link to="/signin">Sign in</Link>
        </Button>
        <Button asChild size="sm" variant="default">
          <Link to="/signup">Get started</Link>
        </Button>
      </div>
    </div>
  );
}
