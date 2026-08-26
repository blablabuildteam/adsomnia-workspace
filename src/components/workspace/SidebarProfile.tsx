"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, LogOut, User, X } from "lucide-react";
import { logout, updateProfile, type ProfileFormResult } from "@/lib/auth";
import { inputClass } from "@/lib/form-styles";

export type SidebarProfileUser = {
  name: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  email: string;
  role: string;
};

type Props = {
  user: SidebarProfileUser;
  collapsed: boolean;
};

const initial: ProfileFormResult = {};

export function SidebarProfile({ user, collapsed }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateProfile, initial);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  const title = user.jobTitle?.trim();

  return (
    <div
      className={[
        "border-t border-border",
        collapsed ? "px-2 py-3" : "px-3 py-4",
      ].join(" ")}
    >
      {!collapsed && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mb-3 flex w-full items-start gap-2 px-1 text-left transition-colors hover:text-foreground"
        >
          <User className="mt-0.5 size-3.5 shrink-0 text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs text-foreground">
              {user.name}
            </span>
            {title ? (
              <span className="mt-0.5 block truncate text-[10px] text-muted">
                {title}
              </span>
            ) : (
              <span className="mt-0.5 block truncate text-[10px] text-muted/70">
                Edit profile
              </span>
            )}
          </span>
        </button>
      )}

      {collapsed && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={user.name}
          className="mb-2 flex w-full items-center justify-center py-2 text-muted transition-colors hover:text-foreground"
        >
          <User className="size-3.5" />
        </button>
      )}

      <form action={logout}>
        <button
          type="submit"
          title={collapsed ? "Sign out" : undefined}
          className={[
            "flex w-full items-center border border-transparent text-xs text-muted transition-colors hover:border-border hover:text-foreground",
            collapsed ? "justify-center py-2" : "gap-2 px-3 py-2",
          ].join(" ")}
        >
          <LogOut className="size-3.5 shrink-0" />
          {!collapsed && (
            <span className="font-display font-bold uppercase tracking-wide">
              Sign Out
            </span>
          )}
        </button>
      </form>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close profile"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-edit-title"
            className="relative z-10 w-full max-w-md border border-border bg-surface p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Profile
                </p>
                <h2
                  id="profile-edit-title"
                  className="font-display mt-1 text-lg font-extrabold uppercase tracking-tight"
                >
                  Edit details
                </h2>
                <p className="mt-1 text-xs text-muted">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border border-transparent p-1 text-muted transition-colors hover:border-border hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              {state.error && (
                <div className="flex items-center gap-2 border border-btr/40 bg-btr/10 px-3 py-2 text-sm text-btr">
                  <AlertCircle className="size-4 shrink-0" />
                  {state.error}
                </div>
              )}
              {state.success && (
                <div className="flex items-center gap-2 border border-border px-3 py-2 text-sm text-muted">
                  <Check className="size-4 shrink-0" />
                  Saved
                </div>
              )}

              <label className="block">
                <span className="font-display text-xs font-bold uppercase tracking-wide">
                  First name
                </span>
                <input
                  name="firstName"
                  type="text"
                  required
                  defaultValue={user.firstName ?? ""}
                  className={`${inputClass} mt-1.5 py-2.5 text-sm`}
                />
              </label>

              <label className="block">
                <span className="font-display text-xs font-bold uppercase tracking-wide">
                  Last name
                </span>
                <input
                  name="lastName"
                  type="text"
                  required
                  defaultValue={user.lastName ?? ""}
                  className={`${inputClass} mt-1.5 py-2.5 text-sm`}
                />
              </label>

              <label className="block">
                <span className="font-display text-xs font-bold uppercase tracking-wide">
                  Job title
                </span>
                <input
                  name="jobTitle"
                  type="text"
                  required
                  defaultValue={user.jobTitle ?? ""}
                  placeholder="e.g. Producer"
                  className={`${inputClass} mt-1.5 py-2.5 text-sm`}
                />
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-border px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 border border-foreground bg-foreground px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
