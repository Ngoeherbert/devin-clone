import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe, FolderGit2 } from "lucide-react";
import { toast } from "sonner";
import { authCallbackURL, authClient } from "@/lib/auth-client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("Agree to the terms to continue.");
      return;
    }
    setLoading(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Couldn't create your account.");
      return;
    }
    // sendVerificationOnSignUp (server config) fires the OTP email automatically.
    navigate("/verify-otp", { state: { purpose: "signup", email } });
  };

  const handleSocial = async (provider: "google" | "github") => {
    await authClient.signIn.social({ provider, callbackURL: authCallbackURL("/chats") });
  };

  return (
    <AuthShell>
      <p className="mb-1 text-center text-lg font-medium">Create your account</p>
      <p className="mb-5 text-center text-[12.5px] text-text-secondary">
        Free to start. No credit card required.
      </p>

      <div className="mb-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={() => handleSocial("google")}
        >
          <Globe className="size-[15px]" />
          Continue with Google
        </Button>
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={() => handleSocial("github")}
        >
          <FolderGit2 className="size-[15px]" />
          Continue with GitHub
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2.5">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] text-text-muted">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSignUp} className="mb-3.5 flex flex-col gap-2.5">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Full name</label>
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
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
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Password</label>
          <Input
            type="password"
            placeholder="At least 8 characters"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <label className="mb-1 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-text-secondary">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          I agree to the <span className="mx-0.5 text-text-accent">terms of service</span> and{" "}
          <span className="text-text-accent">privacy policy</span>
        </label>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-xs text-text-secondary">
        Already have an account?{" "}
        <Link to="/signin" className="text-text-accent">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
