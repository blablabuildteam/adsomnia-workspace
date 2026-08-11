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
    <div className="app-atmosphere flex h-dvh min-h-0 flex-col overflow-hidden">
      <WorkspaceShell userName={user.name}>{children}</WorkspaceShell>
    </div>
  );
}
