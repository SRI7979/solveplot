import { requireUser } from "@/lib/auth";
import HistoryShell from "@/app/history/history-shell";
import { AppearanceStudio } from "@/components/appearance-studio";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Settings | Desmo",
  robots: { index: false, follow: false },
};
export default async function SettingsPage() {
  const user = await requireUser("/settings");
  return (
    <HistoryShell
      email={user.email}
      avatarUrl={user.avatarUrl}
      name={user.name}
      active="settings"
    >
      <AppearanceStudio settings />
    </HistoryShell>
  );
}
