import type { Metadata } from "next";
import { ShareLightMode } from "@/components/theme/ShareLightMode";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SharedProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-atmosphere flex h-dvh min-h-0 flex-col overflow-hidden">
      <ShareLightMode />
      <p className="shrink-0 border-b border-border bg-surface/90 px-4 py-2 text-center text-xs text-muted print:hidden">
        Shared production project — sign-in is not required
      </p>
      <main className="workspace-content min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
