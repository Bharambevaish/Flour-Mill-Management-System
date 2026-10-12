import { CustomerLoginForm, LoginAlert } from "@/components/auth";
import { AuthShell } from "@/components/auth/AuthShell";

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mobile?: string }>;
}) {
  const { error, mobile } = await searchParams;
  // Only digits survive, so the query string can never inject anything odd.
  const initialMobile = (mobile ?? "").replace(/\D/g, "").slice(0, 10);

  return (
    <AuthShell title="ग्राहक लॉगिन" subtitle="Customer login — तुमच्या मालाची स्थिती पहा" tagline="तुमचा माल कुठपर्यंत आला, एका क्लिकवर पहा.">
      {error === "session_expired" && <LoginAlert />}
      <CustomerLoginForm initialMobile={initialMobile} />
    </AuthShell>
  );
}
