import { LoginAlert, OwnerLoginForm } from "@/components/auth";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell title="मालक लॉगिन" subtitle="Owner login — गिरणीचे कामकाज" tagline="आजचे दळण, रांग आणि उधारी — सगळं एका नजरेत.">
      {error === "session_expired" && <LoginAlert />}
      <OwnerLoginForm />
    </AuthShell>
  );
}
