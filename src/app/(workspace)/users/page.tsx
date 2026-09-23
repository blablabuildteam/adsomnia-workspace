import { redirect } from "next/navigation";
import { connection } from "next/server";
import { UsersDirectoryView } from "@/components/users/UsersDirectoryView";
import { getRegisteredUsers } from "@/lib/queries";
import { canViewUserDirectory, getCurrentUser } from "@/lib/session";

export default async function UsersDirectoryPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user || !canViewUserDirectory(user)) {
    redirect("/dashboard");
  }

  const users = await getRegisteredUsers();
  return <UsersDirectoryView users={users} />;
}
