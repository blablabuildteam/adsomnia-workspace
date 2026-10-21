import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import { ArrowUpRight } from "lucide-react";
import { ProductionDetailView } from "@/components/production/ProductionDetailView";
import { getSharedProductionProject } from "@/lib/production/load";
import { createSharePath, verifyProductionShareToken } from "@/lib/share";

type Props = {
  params: Promise<{ token: string }>;
};

const privateRobots = { index: false, follow: false } as const;

const loadShared = cache(async (token: string) => {
  const id = verifyProductionShareToken(token);
  if (id == null) return null;
  return getSharedProductionProject(id);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  try {
    const shared = await loadShared(token);
    if (!shared) {
      return { title: "Shared production project", robots: privateRobots };
    }
    return {
      title: `${shared.project.title} — Production`,
      description: `${shared.project.ticketId} · Adsomnia Workspace`,
      robots: privateRobots,
    };
  } catch {
    return { title: "Shared production project", robots: privateRobots };
  }
}

export default async function SharedProductionPage({ params }: Props) {
  await connection();
  const { token } = await params;

  let shared = null;
  try {
    shared = await loadShared(token);
  } catch (error) {
    console.error("Shared production load failed:", error);
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="font-display text-2xl font-extrabold uppercase">
          Could not load
        </p>
        <p className="mt-2 text-sm text-muted">
          This production project could not be loaded right now.
        </p>
      </div>
    );
  }

  if (!shared) notFound();
  const { project } = shared;

  return (
    <div className="mx-auto w-full max-w-7xl px-0 py-0 sm:px-6 sm:py-8">
      <article className="border-border bg-surface sm:border">
        <ProductionDetailView
          project={project}
          journey={shared.journey}
          tasksByEpic={shared.tasksByEpic}
          actions={
            !project.addedManually && (
              <Link
                href={createSharePath(project.id)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90"
              >
                Open full workstream
                <ArrowUpRight className="size-3.5" />
              </Link>
            )
          }
        />
      </article>
    </div>
  );
}
