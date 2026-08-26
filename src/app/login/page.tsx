import { isGoogleLoginConfigured } from "@/lib/integrations/google-login";
import { LoginForm } from "@/components/auth/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return (
    <LoginForm
      googleEnabled={isGoogleLoginConfigured()}
      errorCode={params.error}
    />
  );
}
