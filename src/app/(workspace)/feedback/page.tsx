import { redirect } from "next/navigation";
import { connection } from "next/server";
import { FeedbackInboxView } from "@/components/feedback/FeedbackInboxView";
import { getFeedbackSubmissions } from "@/lib/queries";
import { canViewFeedbackInbox, getCurrentUser } from "@/lib/session";

export default async function FeedbackInboxPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user || !canViewFeedbackInbox(user)) {
    redirect("/dashboard");
  }

  const items = await getFeedbackSubmissions();
  return <FeedbackInboxView items={items} />;
}
