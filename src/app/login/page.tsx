"use client";

import { useActionState } from "react";
import Image from "next/image";
import { ArrowRight, AlertCircle } from "lucide-react";
import { login, type LoginResult } from "@/lib/auth";
import { inputClass } from "@/lib/form-styles";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";

const initial: LoginResult = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);

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
          <p className="mt-3 text-sm text-muted">
            Sign in to access the Production Framework
          </p>
        </div>

        <form
          action={formAction}
          className="relative border border-border bg-surface/95 p-6 backdrop-blur-sm"
        >
          <CornerTicks />
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
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={`${inputClass} mt-2`}
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign In"}
            <ArrowRight className="size-3.5" />
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
