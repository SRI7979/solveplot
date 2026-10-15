import AccountNav from "@/components/account-nav";
import { requireUser } from "@/lib/auth";
import { desmosScriptUrl } from "@/lib/desmos-loader";
import SolverWorkspace from "./solver-workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Solver | Desmo", robots: { index: false, follow: false } };

export default async function SolverPage() {
  const user = await requireUser("/solve");
  const apiKey = process.env.NEXT_PUBLIC_DESMOS_API_KEY?.trim();
  return <>
    <link rel="preconnect" href="https://www.desmos.com" />
    {apiKey && <link rel="preload" as="script" href={desmosScriptUrl(apiKey)} />}
    <SolverWorkspace accountNav={<AccountNav email={user.email} avatarUrl={user.avatarUrl} name={user.name} active="solve" />} />
  </>;
}
