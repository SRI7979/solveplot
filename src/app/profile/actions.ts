"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
export type ProfileState = { error?: string; message?: string };
export async function updateProfileName(
  _previous: ProfileState,
  form: FormData,
): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to update your profile." };
  const name = form.get("name");
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80)
    return { error: "Enter a name between 1 and 80 characters." };
  try {
    const client = await createClient();
    const { error } = await client.auth.updateUser({
      data: { full_name: name.trim(), name: name.trim() },
    });
    if (error)
      return { error: "Your profile could not be updated. Please try again." };
    revalidatePath("/", "layout");
    return { message: "Profile updated." };
  } catch {
    return { error: "Your profile could not be updated. Please try again." };
  }
}
