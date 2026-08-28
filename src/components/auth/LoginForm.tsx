"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { login, type LoginResult } from "@/lib/auth";
import { inputClass } from "@/lib/form-styles";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";

const initial: LoginResult = {};

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Try again or use email and password.",
  google_not_configured: "Google sign-in is not configured.",
  google_start_failed: "Could not start Google sign-in.",
  google_missing_code: "Google sign-in returned an incomplete response.",
  google_email_unverified: "Verify your Google email address, then try again.",
  google_domain_not_allowed:
    "That Google account domain is not allowed for this workspace.",
};

type LoginFormProps = {
  googleEnabled: boolean;
  errorCode?: string;
};

export function LoginForm({ googleEnabled, errorCode }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(login, initial);
  const [showPassword, setShowPassword] = useState(false);

  const googleError =
    errorCode && GOOGLE_ERROR_MESSAGES[errorCode]
      ? GOOGLE_ERROR_MESSAGES[errorCode]
      : errorCode
        ? GOOGLE_ERROR_MESSAGES.google_failed
        : undefined;
  const error = state.error || googleError;

  return (
    <div className="app-atmosphere relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <BrandTexture variant="page" />
      <div className="workspace-content relative z-10 w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Image
            src="/logos/adsomnia.png"
            alt="Adsomnia"
            width={48}
            height={48}
            className="mx-auto mb-4 size-12"
            priority
          />
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
            Adsomnia
          </p>
          <h1 className="font-display mt-1 text-3xl font-extrabold uppercase tracking-tight">
            Workspace
          </h1>
        </div>

        <div className="approval-action-frame relative border border-border bg-surface/95 p-6 backdrop-blur-sm">
          <span
            aria-hidden
            className="approval-action-border approval-action-border--slow"
          />
          <CornerTicks pulse />
          {error && (
            <div className="mb-4 flex items-center gap-2 border border-btr/40 bg-btr/10 px-3 py-2.5 text-sm text-btr">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <form action={formAction}>
            <label className="block">
              <span className="font-display text-sm font-bold uppercase tracking-wide">
                Email
              </span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`${inputClass} mt-2`}
                placeholder="name@adsomnia.com"
              />
            </label>

            <label className="mt-4 block">
              <span className="font-display text-sm font-bold uppercase tracking-wide">
                Password
              </span>
              <div className="relative mt-2">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className={`${inputClass} pr-11`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={pending}
              className="group relative mt-6 inline-flex w-full items-center justify-center gap-2 overflow-hidden border border-foreground bg-foreground px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-background transition-colors disabled:opacity-50"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-background/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative">
                {pending ? "Signing in…" : "Sign In"}
              </span>
              <ArrowRight className="relative size-3.5" />
            </button>
          </form>

          {googleEnabled && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Or
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <a
                href="/api/auth/google/start"
                className="inline-flex w-full items-center justify-center gap-2 border border-border bg-background px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-foreground transition-colors hover:border-foreground"
              >
                <GoogleMark />
                Continue with Google
              </a>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Contact your administrator for access credentials.
        </p>

        <div className="mx-auto mt-10 flex justify-center">
          <Image
            src="/logos/traffic-never-sleeps-logo.png"
            alt="Traffic Never Sleeps"
            width={716}
            height={178}
            className="animate-logo-write-in h-16 w-auto sm:h-20"
          />
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden
      className="size-4"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
