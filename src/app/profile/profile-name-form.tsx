"use client";
import { useActionState } from "react";
import { updateProfileName } from "./actions";
import styles from "@/app/settings/page.module.css";
export default function ProfileNameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateProfileName, {});
  return (
    <form action={action} className={styles.form} style={{ marginTop: 24 }}>
      <label htmlFor="profile-name">
        Display name
        <input
          id="profile-name"
          name="name"
          defaultValue={name}
          required
          maxLength={80}
          autoComplete="name"
        />
      </label>
      <button type="submit" className="secondaryButton" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </button>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className={styles.success} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
