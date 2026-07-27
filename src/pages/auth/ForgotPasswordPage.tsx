import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { AuthShell, AuthHeading, BackLink } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "forget-password",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Couldn't send the code.");
      return;
    }
    toast.success("Code sent to your email");
    navigate("/verify-otp", { state: { purpose: "reset", email } });
  };

  return (
    <AuthShell>
      <AuthHeading
        icon={<Lock className="size-[18px] text-text-accent" />}
        title="Forgot password"
        subtitle="Enter your email and we'll send a code to reset your password."
      />

      <form onSubmit={handleSubmit} className="mb-4.5 flex flex-col gap-2.5">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Email</label>
          <Input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? "Sending…" : "Send code"}
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
