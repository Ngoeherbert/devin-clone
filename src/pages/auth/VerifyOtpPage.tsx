import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MailOpen, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { AuthShell, AuthHeading, BackLink } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

function maskEmail(email?: string) {
  if (!email) return "your email";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 1)}***@${domain}`;
}

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as { purpose?: "signup" | "reset"; email?: string };
  const purpose = state.purpose ?? "reset";
  const email = state.email;

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      // Landed here directly with no OTP request in flight.
      navigate(purpose === "signup" ? "/signup" : "/forgot-password", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const handleChange = (index: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otp = digits.join("");
    if (otp.length < CODE_LENGTH || !email) {
      toast.error("Enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    if (purpose === "signup") {
      const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
      setLoading(false);
      if (error) {
        toast.error(error.message ?? "That code didn't work.");
        return;
      }
      toast.success("Email verified");
      navigate("/chats");
    } else {
      const { error } = await authClient.emailOtp.checkVerificationOtp({
        email,
        otp,
        type: "forget-password",
      });
      setLoading(false);
      if (error) {
        toast.error(error.message ?? "That code didn't work.");
        return;
      }
      toast.success("Code verified");
      navigate("/new-password", { state: { email, otp } });
    }
  };

  const handleResend = async () => {
    if (seconds > 0 || !email) return;
    setSeconds(RESEND_SECONDS);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: purpose === "signup" ? "email-verification" : "forget-password",
    });
    if (error) {
      toast.error(error.message ?? "Couldn't resend the code.");
      return;
    }
    toast("New code sent");
  };

  return (
    <AuthShell>
      <AuthHeading
        icon={<MailOpen className="size-[18px] text-text-accent" />}
        title="Check your email"
        subtitle={`Enter the 6-digit code we sent to ${maskEmail(email)}`}
      />

      <div className="mb-4.5 flex justify-center gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            maxLength={1}
            inputMode="numeric"
            className="h-11 w-10 rounded-md border border-border bg-surface-1 text-center text-base outline-none focus:border-border-accent focus:ring-2 focus:ring-accent/20"
          />
        ))}
      </div>

      <Button onClick={handleVerify} disabled={loading} className="mb-3.5 w-full">
        {loading ? "Verifying…" : "Verify code"}
      </Button>

      <p className="mb-1.5 text-center text-xs text-text-secondary">
        Didn't get a code?{" "}
        <button
          onClick={handleResend}
          disabled={seconds > 0}
          className="text-text-accent disabled:text-text-muted"
        >
          {seconds > 0 ? `Resend in ${seconds}s` : "Resend"}
        </button>
      </p>

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
