import { redirect } from "next/navigation";
import { InitiativeDetailPage } from "@/components/initiatives/InitiativeDetailView";
import { isPreviewLocked } from "@/data/preview-access";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InitiativePage({ params }: Props) {
  if (isPreviewLocked("/initiatives")) {
    redirect("/");
  }

  const { id } = await params;
  return <InitiativeDetailPage id={id} />;
}
