import { InitiativeDetailPage } from "@/components/initiatives/InitiativeDetailView";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InitiativePage({ params }: Props) {
  const { id } = await params;
  return <InitiativeDetailPage id={id} />;
}
