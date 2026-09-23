import { isGoogleLoginConfigured } from "@/lib/integrations/google-login";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeReturnPath } from "@/lib/return-path";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return (
    <LoginForm
      googleEnabled={isGoogleLoginConfigured()}
      errorCode={params.error}
      nextPath={safeReturnPath(params.next)}
    />
  );
}
