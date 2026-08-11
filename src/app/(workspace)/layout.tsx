import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="app-atmosphere flex min-h-full flex-1 flex-col">
      <WorkspaceShell userName={user.name}>{children}</WorkspaceShell>
    </div>
  );
}
