import { notFound } from "next/navigation";
import Link from "next/link";
import { InitiativeDetailView } from "@/components/initiatives/InitiativeDetailView";
import { getInitiativeById, getActivityForInitiative } from "@/lib/queries";
import { getCurrentUser, canApprove } from "@/lib/session";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InitiativePage({ params }: Props) {
  const { id } = await params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    notFound();
  }

  const [initiative, user] = await Promise.all([
    getInitiativeById(numericId),
    getCurrentUser(),
  ]);

  if (!initiative) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="font-display text-2xl font-extrabold uppercase">
          Initiative Not Found
        </p>
        <p className="mt-2 text-sm text-muted">
          No initiative with ID <span className="font-mono">{id}</span>.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 border border-foreground px-4 py-2 font-display text-xs font-bold uppercase tracking-wide"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const activity = await getActivityForInitiative(initiative.id);
  const canUserApprove = user ? canApprove(user) : false;

  return (
    <InitiativeDetailView
      initiative={initiative}
      activity={activity}
      canUserApprove={canUserApprove}
    />
  );
}
