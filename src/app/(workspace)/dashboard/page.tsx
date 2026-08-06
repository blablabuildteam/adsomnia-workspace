import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { isPreviewLocked } from "@/data/preview-access";

export default function DashboardPage() {
  if (isPreviewLocked("/dashboard")) {
    redirect("/");
  }

  return <DashboardView />;
}
