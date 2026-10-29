import { cache } from "react";
import { solverPageMetadata } from "@/lib/solver-page-metadata";
import AccountNav from "@/components/account-nav";
import { getCurrentUser } from "@/lib/auth";
import { GuestAuthScope } from "@/components/guest-auth-provider";
import { desmosScriptUrl } from "@/lib/desmos-loader";
import SolverWorkspace from "./solver-workspace";

export const dynamic = "force-dynamic";
// Reuse the same authoritative identity result for metadata and page rendering.
// React's cache is request-scoped; identities are never shared across visitors.
const getSolverUser = cache(getCurrentUser);

export async function generateMetadata() {
  return solverPageMetadata(Boolean(await getSolverUser()));
}

export default async function SolverPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const query = await searchParams;
  const user = await getSolverUser();
  const apiKey = process.env.NEXT_PUBLIC_DESMOS_API_KEY?.trim();
  return (
    <>
      <link rel="preconnect" href="https://www.desmos.com" />
      {apiKey && (
        <link rel="preload" as="script" href={desmosScriptUrl(apiKey)} />
      )}
      <GuestAuthScope authenticated={Boolean(user)}><SolverWorkspace
        key={user?.id ?? "guest"}
        userId={user?.id}
        startFresh={query.new === "1"}
        accountNav={
          <AccountNav
            email={user?.email}
            avatarUrl={user?.avatarUrl}
            name={user?.name}
            active="solve"
          />
        }
      /></GuestAuthScope>
    </>
  );
}
