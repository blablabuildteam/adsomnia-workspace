import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { FastTrackSharedView } from "@/components/fast-track/FastTrackSharedView";
import { loadSharedFastTrackItem } from "@/lib/fast-track";

type Props = {
  params: Promise<{ token: string }>;
};

const privateRobots = { index: false, follow: false } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  try {
    const item = await loadSharedFastTrackItem(token);
    if (!item) {
      return { title: "Shared Fast-Track", robots: privateRobots };
    }
    return {
      title: `${item.title} — Fast-Track`,
      description: `${item.jiraKey ?? "Fast-Track"} · Adsomnia Workspace`,
      robots: privateRobots,
    };
  } catch {
    return { title: "Shared Fast-Track", robots: privateRobots };
  }
}

export default async function SharedFastTrackPage({ params }: Props) {
  await connection();
  const { token } = await params;

  let item = null;
  try {
    item = await loadSharedFastTrackItem(token);
  } catch (error) {
    console.error("Shared Fast-Track load failed:", error);
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="font-display text-2xl font-extrabold uppercase">
          Could not load
        </p>
        <p className="mt-2 text-sm text-muted">
          This Fast-Track item could not be loaded right now.
        </p>
      </div>
    );
  }

  if (!item) notFound();
  return <FastTrackSharedView item={item} />;
}
