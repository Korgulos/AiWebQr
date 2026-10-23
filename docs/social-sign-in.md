# Google and Microsoft sign-in

## Current setup (23 October 2026)

- Google project: `global-tine-512510-n0` (QR Gen Me), managed through
  `korgulos.inc@gmail.com`. Production OAuth client: QR Gen Me Production.
- Google credentials are stored in Vercel Production; Client Secret has type Secret.
  Both www and apex production callbacks are registered. No credentials are in this document.
- Migration 006 and the social sign-in implementation are deployed to production.
  The live login page displays Google. Human consent → callback → session →
  authenticated dashboard was verified with the Korgulos account.
- Public privacy policy: <https://www.qr-gen-me.com/privacy>, operator Dejan Katić.
- Google app publishing status is **In production**. Its initial publishing request
  returned a transient Google error; the offered Retry completed successfully.
- Microsoft app **QR Gen Me** is registered for organizational and personal accounts
  in tenant `f2358be7-e8bb-4da5-a816-67594862e753`
  (`katicod100gmail.onmicrosoft.com`). Application ID:
  `6dd593a8-e598-43a5-83e9-f32a6fa2c643`.
  The original personal-account portal error was resolved by creating this directory.
  Production credentials are stored on Vercel; Client Secret has type Secret and
  expires on **21 April 2027**. Both production callbacks and the homepage/privacy
  URLs are configured. Production redeploy is Ready; the login page displays both
  providers and the Microsoft link reaches the correct application's sign-in page.
  Human consent → callback → session → authenticated dashboard was verified
  after the user completed Microsoft sign-in (Dejan Katic).

Apply `006_social_accounts` before enabling either provider. Use separate OAuth
clients/secrets for development and production. Existing password login stays available.
Buttons appear only when both credentials for that provider are configured.

## Google Cloud

1. Open <https://console.cloud.google.com/auth/clients>, select or create a project.
2. Configure Google Auth Platform branding as **QR Gen Me**, with a support email.
   Choose an External audience. Basic identity-only sign-in has an exception to the
   Testing allowlist restrictions; additional scopes can require explicit test users.
3. Create an OAuth client of type **Web application**.
4. Register these exact Authorized redirect URIs:
   - `https://www.qr-gen-me.com/api/auth/google/callback`
   - `https://qr-gen-me.com/api/auth/google/callback`
   - Development client: `http://localhost:5173/api/auth/google/callback`
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on Vercel. Store the secret as
   **Secret**, then redeploy. Publish the consent app when ready for public use.

Only `openid profile email` is requested; no Drive, Gmail or offline access.
Official guide: <https://developers.google.com/identity/openid-connect/openid-connect>.

## Microsoft Entra

1. Open <https://entra.microsoft.com/> → App registrations → New registration.
2. Name: **QR Gen Me**. Supported account types: **Accounts in any organizational
   directory and personal Microsoft accounts** (matches the app's `common` authority).
3. Add a **Web** platform, with these redirect URIs:
   - `https://www.qr-gen-me.com/api/auth/microsoft/callback`
   - `https://qr-gen-me.com/api/auth/microsoft/callback`
   - Development registration: `http://localhost:5173/api/auth/microsoft/callback`
4. Create a client secret. Copy its **Value**, not its Secret ID. Set an expiry
   reminder using your normal credential management process.
5. Store Application (client) ID as `MICROSOFT_CLIENT_ID` and secret Value as
   `MICROSOFT_CLIENT_SECRET` on Vercel (type **Secret**), then redeploy.

Only `openid profile email` is requested. No Graph API permissions or refresh tokens
are used. Users without an email claim can connect Microsoft to an existing account
from Account settings. Microsoft email is profile data, never a linking credential
or proof of email verification. Identity uses the signed tenant and subject claims.
Official guide: <https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow>.

## Behavior and validation

- A new provider identity creates one user and an existing provider identity signs
  into the same user. Campaigns stay attached to the existing integer owner ID.
- Matching emails never silently merge accounts. Sign in with the existing method,
  then connect the provider in Account settings. A provider can belong to only one user.
- OAuth transactions expire after ten minutes, are signed, scoped to the provider
  and browser, and use state, nonce, PKCE and an HttpOnly SameSite cookie.
- Google ID tokens are validated by Google's library. Microsoft tokens are verified
  against Microsoft's JWKS with audience, issuer, tenant, signature, expiry and nonce checks.
- Tokens and client secrets are never returned to the browser or stored in the database.
- New social-only users get a random unusable password hash. Existing password change
  and deletion flows still require a password; social reauthentication for those
  operations and password recovery are separate follow-up work.
- Test the full browser consent flow after provisioning each OAuth client: new user,
  repeat login, cancellation, existing-email collision, and linking while signed in.
  Automated tests use isolated fixtures; they cannot establish provider credentials.
