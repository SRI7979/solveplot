# Google sign-in branding

The app is now **SolvePlot**. Follow the
[SolvePlot domain migration guide](solveplot-domain-migration.md#google-sign-in-branding)
for the exact Branding fields, domain setup, existing Supabase callback, and
verification/publishing steps.

The website controls its own logo and text. Google controls the account chooser
and consent screen. Saving application code does not update Google's published
branding; submit the updated brand in the existing Google Auth Platform project.

Use the existing OAuth client and Supabase project so existing Google users,
history, and saved tricks remain connected to their current accounts.

References: [Google branding settings](https://support.google.com/cloud/answer/15549049),
[Supabase Google branding guide](https://supabase.com/docs/guides/auth/social-login/auth-google#setup-consent-screen-branding).
