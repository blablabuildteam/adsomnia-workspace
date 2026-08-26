"use client";

import { useActionState } from "react";
import Image from "next/image";
import { AlertCircle, ArrowRight } from "lucide-react";
import {
  completeProfile,
  type ProfileFormResult,
} from "@/lib/auth";
import { inputClass } from "@/lib/form-styles";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";

const initial: ProfileFormResult = {};

type Props = {
  email: string;
  defaultFirstName: string;
  defaultLastName: string;
  defaultJobTitle: string;
};

export function CompleteProfileForm({
  email,
  defaultFirstName,
  defaultLastName,
  defaultJobTitle,
}: Props) {
  const [state, formAction, pending] = useActionState(completeProfile, initial);

  return (
    <div className="app-atmosphere relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <BrandTexture variant="page" />
      <div className="workspace-content relative z-10 w-full max-w-[420px]">
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
            Adsomnia Workspace
          </p>
          <h1 className="font-display mt-1 text-3xl font-extrabold uppercase tracking-tight">
            Complete Profile
          </h1>
          <p className="mt-2 text-sm text-muted">
            Confirm how you appear in the workspace before continuing. Signed in
            as {email}.
          </p>
        </div>

        <form
          action={formAction}
          className="approval-action-frame relative border border-border bg-surface/95 p-6 backdrop-blur-sm"
        >
          <span
            aria-hidden
            className="approval-action-border approval-action-border--slow"
          />
          <CornerTicks pulse />

          {state.error && (
            <div className="mb-4 flex items-center gap-2 border border-btr/40 bg-btr/10 px-3 py-2.5 text-sm text-btr">
              <AlertCircle className="size-4 shrink-0" />
              {state.error}
            </div>
          )}

          <label className="block">
            <span className="font-display text-sm font-bold uppercase tracking-wide">
              First name
            </span>
            <input
              name="firstName"
              type="text"
              required
              autoComplete="given-name"
              defaultValue={defaultFirstName}
              className={`${inputClass} mt-2`}
            />
          </label>

          <label className="mt-4 block">
            <span className="font-display text-sm font-bold uppercase tracking-wide">
              Last name
            </span>
            <input
              name="lastName"
              type="text"
              required
              autoComplete="family-name"
              defaultValue={defaultLastName}
              className={`${inputClass} mt-2`}
            />
          </label>

          <label className="mt-4 block">
            <span className="font-display text-sm font-bold uppercase tracking-wide">
              Job title
            </span>
            <input
              name="jobTitle"
              type="text"
              required
              autoComplete="organization-title"
              defaultValue={defaultJobTitle}
              placeholder="e.g. Producer"
              className={`${inputClass} mt-2`}
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="group relative mt-6 inline-flex w-full items-center justify-center gap-2 overflow-hidden border border-foreground bg-foreground px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-background transition-colors disabled:opacity-50"
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-background/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
            <span className="relative">
              {pending ? "Saving…" : "Continue to workspace"}
            </span>
            <ArrowRight className="relative size-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
