import EmailVerificationCard from "@/components/auth/EmailVerificationCard";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string; preview?: string }>;
}) {
  const params = await searchParams;
  return (
    <EmailVerificationCard
      email={params.email}
      token={params.token ?? params.preview}
    />
  );
}
