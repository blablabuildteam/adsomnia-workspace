import { getCurrentUser } from "@/lib/session";
import { IdeaFormView } from "@/components/ideas/IdeaFormView";

export default async function NewIdeaPage() {
  const user = await getCurrentUser();

  return <IdeaFormView submitterName={user!.name} />;
}
