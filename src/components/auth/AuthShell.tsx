import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-1 px-4 py-10">
      <div className="w-full max-w-[340px] rounded-xl border border-border bg-surface-2 p-7">
        <Link to="/" className="mb-5 flex items-center justify-center gap-2">
          <span className="flex size-[22px] items-center justify-center rounded-md bg-text-primary">
            <Zap className="size-[13px] text-surface-2" />
          </span>
          <span className="text-sm font-medium">Omni</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

export function AuthHeading({
  icon,
  title,
  subtitle,
}: {
  icon?: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <>
      {icon && (
        <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-[10px] bg-bg-accent">
          {icon}
        </div>
      )}
      <p className="mb-1 text-center text-lg font-medium">{title}</p>
      <p className="mb-5 text-center text-[12.5px] leading-relaxed text-text-secondary">
        {subtitle}
      </p>
    </>
  );
}

export function BackLink({ to, label }: { to: string; label: ReactNode }) {
  return (
    <p className="text-center text-xs">
      <Link
        to={to}
        className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary"
      >
        {label}
      </Link>
    </p>
  );
}
