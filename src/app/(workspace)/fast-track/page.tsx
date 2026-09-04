import { connection } from "next/server";
import { FastTrackView } from "@/components/fast-track/FastTrackView";
import { loadFastTrackOverview } from "@/lib/fast-track";

export default async function FastTrackPage() {
  await connection();
  const overview = await loadFastTrackOverview();
  return <FastTrackView {...overview} />;
}
