import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireGuest } from "@/components/auth/RequireGuest";
import { LandingPage } from "@/pages/LandingPage";
import { SignInPage } from "@/pages/auth/SignInPage";
import { SignUpPage } from "@/pages/auth/SignUpPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { VerifyOtpPage } from "@/pages/auth/VerifyOtpPage";
import { NewPasswordPage } from "@/pages/auth/NewPasswordPage";
import { StaticPage } from "@/pages/static/StaticPage";

const STATIC_SLUGS = [
  "about",
  "careers",
  "blog",
  "contact",
  "docs",
  "changelog",
  "status",
  "community",
  "privacy",
  "terms",
  "security",
];

function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {STATIC_SLUGS.map((slug) => (
          <Route key={slug} path={`/${slug}`} element={<StaticPage slug={slug} />} />
        ))}

        <Route
          path="/signin"
          element={
            <RequireGuest>
              <SignInPage />
            </RequireGuest>
          }
        />
        <Route
          path="/signup"
          element={
            <RequireGuest>
              <SignUpPage />
            </RequireGuest>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <RequireGuest>
              <ForgotPasswordPage />
            </RequireGuest>
          }
        />
        <Route
          path="/verify-otp"
          element={
            <RequireGuest>
              <VerifyOtpPage />
            </RequireGuest>
          }
        />
        <Route
          path="/new-password"
          element={
            <RequireGuest>
              <NewPasswordPage />
            </RequireGuest>
          }
        />

        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        />
      </Routes>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
            fontSize: "13px",
          },
        }}
      />
    </TooltipProvider>
  );
}

export default App;
