import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "@/lib/auth-client";

/** Wraps /signin, /signup, etc. — bounces signed-in users back into the app. */
export function RequireGuest({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-0 text-sm text-text-secondary">
        Loading…
      </div>
    );
  }

  if (session) {
    return <Navigate to="/chats" replace />;
  }

  return <>{children}</>;
}
