import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe, FolderGit2 } from "lucide-react";
import { toast } from "sonner";
import { authCallbackURL, authClient } from "@/lib/auth-client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Couldn't sign in.");
      return;
    }
    toast.success("Signed in");
    navigate("/chats");
  };

  const handleSocial = async (provider: "google" | "github") => {
    await authClient.signIn.social({ provider, callbackURL: authCallbackURL("/chats") });
  };

  return (
    <AuthShell>
      <p className="mb-1 text-center text-lg font-medium">Welcome back</p>
      <p className="mb-5 text-center text-[12.5px] text-text-secondary">
        Sign in to continue to your workspace.
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

      <form onSubmit={handleSignIn} className="mb-4 flex flex-col gap-2.5">
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
          <div className="mb-1 flex items-baseline">
            <label className="flex-1 text-xs text-text-secondary">Password</label>
            <Link to="/forgot-password" className="text-[11.5px] text-text-accent">
              Forgot?
            </Link>
          </div>
          <Input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="mt-1.5 w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-xs text-text-secondary">
        Don't have an account?{" "}
        <Link to="/signup" className="text-text-accent">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
