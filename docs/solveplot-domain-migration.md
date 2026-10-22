# SolvePlot: domain and account settings

Planned domain: `solveplot.com`. Buy and connect it before changing production
redirects. The code uses `NEXT_PUBLIC_SITE_URL` for authentication, canonical URLs,
share cards, `robots.txt`, and `sitemap.xml`, so the existing live domain can serve
the renamed application until the new domain is ready.

## Connect the domain

1. Buy `solveplot.com` using your registrar account.
2. Open the existing project in [Vercel](https://vercel.com/sri7979/solveplot), then
   **Settings → Domains**. Add `solveplot.com` and `www.solveplot.com`.
3. At the registrar, enter the exact DNS records Vercel displays. Wait for both
   domains to show valid DNS and HTTPS. Redirect `www` to `https://solveplot.com`.
4. Create a working mailbox or forwarding address for `support@solveplot.com`.
   The site shows **Contact support** and can keep using the existing monitored
   mailbox until the new one is working; the new domain does not create email.
5. In Vercel **Settings → Environment Variables**, set Production:

   ```text
   NEXT_PUBLIC_SITE_URL=https://solveplot.com
   NEXT_PUBLIC_SUPPORT_EMAIL=support@solveplot.com
   ```

   Keep local development at `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
   Preview deployments need their own allowed authentication origin.
6. Complete the Supabase and Google changes below, then redeploy. Public
   environment values are compiled into the build.

Use Vercel's [domain configuration guide](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
for the current registrar-specific steps and DNS values.

## Supabase sign-in and email

Keep the existing Supabase project, database, storage bucket, users, and keys.
Renaming the app does not require recreating accounts or moving saved solutions.

In **Authentication → URL Configuration**:

- Set **Site URL** to `https://solveplot.com` when the domain is live.
- Add `https://solveplot.com/auth/callback` and
  `https://solveplot.com/auth/callback?**` to **Redirect URLs**. The query wildcard
  covers Google sign-in, password recovery, and safe return paths.
- Keep `http://localhost:3000/**` for local development.
- Keep the previous production callback entries through the transition so
  already-issued confirmation or recovery links can complete.

Review **Authentication → Email Templates** and your SMTP provider. Change any
hardcoded application name, logo links, URLs, and sender display name to
**SolvePlot**. If you change the sending address, verify the new domain with the
mail provider and add its required DNS records first. An existing SMTP sender
can continue working during the move.

Reference: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Google sign-in branding

Open [Google Auth Platform → Branding](https://console.cloud.google.com/auth/branding)
and select the existing project whose OAuth client is configured in Supabase.

- **App name:** `SolvePlot`
- **User support email:** an eligible, monitored email account
- **Homepage:** `https://solveplot.com`
- **Privacy policy:** `https://solveplot.com/privacy`
- **Terms of service:** `https://solveplot.com/terms`
- **Authorized domains:** add `solveplot.com` and verify ownership when requested
- **Logo:** `src/app/apple-icon.png` is the existing product mark

Save the changes, complete Google's branding verification, and publish the
approved branding. Google's review and publishing state control when users see
the new name. The Cloud project's display name can also become **SolvePlot**;
its project ID can stay as it is.

In **Google Auth Platform → Clients**, edit the existing Web client. Add
`https://solveplot.com` to its authorized JavaScript origins if configured there;
keep `http://localhost:3000` for development. Retain this authorized redirect URI:

```text
https://jwfrozzoknimldsmexgq.supabase.co/auth/v1/callback
```

That is Google's callback to Supabase. The separate application callback is
`https://solveplot.com/auth/callback`. Keep the existing client ID and secret so
existing Google users keep their accounts.

References: [Google branding settings](https://support.google.com/cloud/answer/15549049),
[Supabase Google configuration](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Google Search

After the new domain serves the site successfully:

1. In [Search Console](https://search.google.com/search-console), add and verify
   a **Domain property** for `solveplot.com` with Google's DNS TXT record. Use an
   account that owns both the previous and new site properties.
2. Submit `https://solveplot.com/sitemap.xml`. Inspect the homepage and request
   indexing. The sitemap includes the homepage, FAQ, privacy policy, and terms.
3. Set permanent redirects from the previous public URLs to the same paths on
   `solveplot.com`, then use the previous Search Console property's
   **Settings → Change of address** workflow. Check any `www` variants too.
4. Test Google sign-in, email confirmation, password reset, reopening History,
   Saved tricks, image uploads, typed questions, and share previews on the new
   domain before retiring the previous domain.

Users will sign in again on the new domain because browser cookies and local
preferences do not transfer between domains. Their server-side history and
saved tricks remain associated with the same Supabase user.

Reference: [Google's Change of Address instructions](https://support.google.com/webmasters/answer/9370220).

## Repository and local files

Repository: `https://github.com/SRI7979/solveplot`.
The source uses SolvePlot names for components, assets, browser keys, custom
DOM events, diagnostics, and package metadata. The previous browser preference
prefix remains in the one-time migration so existing preferences survive on the
current domain. Historical source-repository links retain their real addresses.
References to **Desmos** identify the actual embedded calculator and its API.

Other local clones can update their remote with:

```sh
git remote set-url origin https://github.com/SRI7979/solveplot.git
```

When ready to rename local workspace folders, close running dev servers and IDE
windows first. For a linked worktree, use `git worktree move` from the main
checkout, then reopen the new folder. Do not manually rewrite `.git` files.
