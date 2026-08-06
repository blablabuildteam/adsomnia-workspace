import { redirect } from "next/navigation";
import { IdeaFormView } from "@/components/ideas/IdeaFormView";
import { isPreviewLocked } from "@/data/preview-access";

export default function NewIdeaPage() {
  if (isPreviewLocked("/ideas/new")) {
    redirect("/");
  }

  return <IdeaFormView />;
}
