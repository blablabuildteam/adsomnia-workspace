import { redirect } from "next/navigation";
import {
  displayName,
  getCurrentUser,
  needsProfileCompletion,
} from "@/lib/session";
import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";

export default async function CompleteProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!needsProfileCompletion(user)) {
    redirect("/dashboard");
  }

  const first =
    user.firstName?.trim() ||
    displayName(user).split(/\s+/)[0] ||
    "";
  const last =
    user.lastName?.trim() ||
    displayName(user).split(/\s+/).slice(1).join(" ") ||
    "";

  return (
    <CompleteProfileForm
      email={user.email}
      defaultFirstName={first}
      defaultLastName={last}
      defaultJobTitle={user.jobTitle ?? ""}
    />
  );
}
