"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { login, type LoginResult } from "@/lib/auth";
import { inputClass } from "@/lib/form-styles";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { TwinkleField } from "@/components/ui/TwinkleField";

const initial: LoginResult = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="app-atmosphere relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <TwinkleField />
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

        <form
          action={formAction}
          className="approval-action-frame relative border border-border bg-surface/95 p-6 backdrop-blur-sm"
        >
          <span aria-hidden className="approval-action-border approval-action-border--slow" />
          <CornerTicks pulse />
          {state.error && (
            <div className="mb-4 flex items-center gap-2 border border-btr/40 bg-btr/10 px-3 py-2.5 text-sm text-btr">
              <AlertCircle className="size-4 shrink-0" />
              {state.error}
            </div>
          )}

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

        <p className="mt-4 text-center text-xs text-muted">
          Contact your administrator for access credentials.
        </p>

        <p className="mt-10 text-center font-display text-[9px] font-bold uppercase tracking-[0.45em] text-muted/40">
          Traffic Never Sleeps
        </p>
      </div>
    </div>
  );
}
