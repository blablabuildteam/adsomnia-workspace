import { connection } from "next/server";
import { FastTrackView } from "@/components/fast-track/FastTrackView";
import { loadFastTrackOverview } from "@/lib/fast-track";
import { getCurrentUser } from "@/lib/session";

export default async function FastTrackPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) return null;

  const overview = await loadFastTrackOverview(user);
  return <FastTrackView {...overview} />;
}
