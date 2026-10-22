import AccountNav from "@/components/account-nav";
import { requireUser } from "@/lib/auth";
import { desmosScriptUrl } from "@/lib/desmos-loader";
import SolverWorkspace from "./solver-workspace";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Solver | SolvePlot",
  robots: { index: false, follow: false },
};

export default async function SolverPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const query = await searchParams;
  const user = await requireUser("/solve");
  const apiKey = process.env.NEXT_PUBLIC_DESMOS_API_KEY?.trim();
  return (
    <>
      <link rel="preconnect" href="https://www.desmos.com" />
      {apiKey && (
        <link rel="preload" as="script" href={desmosScriptUrl(apiKey)} />
      )}
      <SolverWorkspace
        key={user.id}
        userId={user.id}
        startFresh={query.new === "1"}
        accountNav={
          <AccountNav
            email={user.email}
            avatarUrl={user.avatarUrl}
            name={user.name}
            active="solve"
          />
        }
      />
    </>
  );
}
