import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import HistoryShell from "@/app/history/history-shell";
import PasswordForm from "@/app/settings/password-form";
import ProfileNameForm from "./profile-name-form";
import styles from "@/app/settings/page.module.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your profile | SolvePlot",
  robots: { index: false, follow: false },
};
export default async function ProfilePage() {
  const user = await requireUser("/profile");
  return (
    <HistoryShell {...user} active="profile">
      <div className={`${styles.page} appPageEnter`}>
        <header className="wsPageHeading">
          <h1>Your profile</h1>
          <p>Manage your account.</p>
        </header>
        <section className={styles.card}>
          <h2>Account</h2>
          <div className={styles.accountRow}>
            <span>Email</span>
            <strong>{user.email || "No email available"}</strong>
          </div>
          <ProfileNameForm name={user.name ?? ""} />
        </section>
        <section className={styles.card}>
          <h2>Password</h2>
          <p>Choose a new password for your account.</p>
          <PasswordForm />
        </section>
        <form action={signOut}>
          <button type="submit" className="secondaryButton">
            Sign out
          </button>
        </form>
      </div>
    </HistoryShell>
  );
}
