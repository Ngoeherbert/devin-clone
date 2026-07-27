import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Check, Circle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { AuthShell, AuthHeading, BackLink } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as { email?: string; otp?: string };

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state.email || !state.otp) {
      navigate("/forgot-password", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasLength = password.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasLength || !hasNumberOrSymbol) {
      toast.error("Choose a stronger password.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    if (!state.email || !state.otp) return;

    setLoading(true);
    const { error } = await authClient.emailOtp.resetPassword({
      email: state.email,
      otp: state.otp,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Couldn't reset your password.");
      return;
    }
    toast.success("Password updated");
    navigate("/signin");
  };

  return (
    <AuthShell>
      <AuthHeading
        icon={<ShieldCheck className="size-[18px] text-text-success" />}
        title="Set a new password"
        subtitle="Your code is verified. Choose a new password for your account."
      />

      <form onSubmit={handleSubmit} className="mb-2 flex flex-col gap-2.5">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">New password</label>
          <Input
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Confirm password</label>
          <Input
            type="password"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        <div className="mb-1.5 mt-0.5 flex flex-col gap-1">
          <span
            className={cn(
              "flex items-center gap-1.5 text-[11.5px]",
              hasLength ? "text-text-success" : "text-text-muted"
            )}
          >
            {hasLength ? <Check className="size-3.5" /> : <Circle className="size-2.5" />}
            At least 8 characters
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5 text-[11.5px]",
              hasNumberOrSymbol ? "text-text-success" : "text-text-muted"
            )}
          >
            {hasNumberOrSymbol ? (
              <Check className="size-3.5" />
            ) : (
              <Circle className="size-2.5" />
            )}
            One number or symbol
          </span>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Resetting…" : "Reset password"}
        </Button>
      </form>

      <BackLink
        to="/signin"
        label={
          <>
            <ArrowLeft className="size-3.5" />
            Back to sign in
          </>
        }
      />
    </AuthShell>
  );
}
