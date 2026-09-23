import { redirect } from "next/navigation";
import {
  displayName,
  getCurrentUser,
  needsProfileCompletion,
} from "@/lib/session";
import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";
import { safeReturnPath } from "@/lib/return-path";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function CompleteProfilePage({ searchParams }: Props) {
  const next = safeReturnPath((await searchParams).next);
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!needsProfileCompletion(user)) {
    redirect(next ?? "/dashboard");
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
      nextPath={next}
    />
  );
}
