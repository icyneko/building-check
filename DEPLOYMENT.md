# Deployment and mobile access

## Existing live deployment

Room Rounds is already deployed at https://room-rounds-checklists.icyneko.chatgpt.site using Sites hosting, a Cloudflare Worker, and a D1 database. It does not depend on a computer running a local preview. Open the HTTPS URL in a modern phone or tablet browser; no app-store installation is needed.

The Sites audience is public so visitors can reach the Google sign-in screen without a ChatGPT account. The app requires a verified Google session before reading or writing the shared workspace. Any Google user can access the same buildings, check-in history, and configuration controls; there are no separate administrator/checker roles. Do not deploy an older version without Google authentication to this public audience.

## Google sign-in

Set `GOOGLE_CLIENT_ID` in Sites runtime environment variables, then deploy. Locally, copy `.env.example` to `.env.local` and use your web client ID. This ID is public; no Google client secret is required for the Google Identity Services button flow.

In Google Auth Platform, configure an External audience and a Web application client. Add `https://room-rounds-checklists.icyneko.chatgpt.site` as an Authorized JavaScript origin. For local sign-in testing, also add `http://localhost` and `http://localhost:5173`. The JavaScript callback flow does not use a redirect URI. Check the Audience page for any testing-mode restrictions and complete Google's publishing requirements before distributing the app to everyone.

Google signs the profile token; the server verifies its signature, issuer, audience, expiry, verified email, and login nonce. The session cookie is HttpOnly, host-only and Secure on HTTPS; it expires with Google's ID token (typically about one hour). Visitors then sign in again. Sign-out clears the browser cookie. The app does not request access to Google Drive, Gmail or other Google data. The name field defaults to the verified profile name (email if unavailable), remains editable, and is reset to the new profile when switching accounts. Logged names remain user-entered labels, not immutable identity records.

## Publish changes to this existing Site

1. Check out `main` from https://github.com/icyneko/building-check.
2. Use Node.js 22.13+ and run `npm ci`.
3. Run `npx tsc --noEmit --incremental false` and `npm run build`.
4. Commit the exact source used for the build. Using the Sites publishing workflow, synchronize that source with the repository belonging to the existing project in `.openai/hosting.json`, package the build output and migrations, and deploy a new version to the same project.
5. Confirm deployment status is `succeeded` before distributing the live URL.

Pushing to GitHub alone does not deploy the app: no GitHub deployment workflow is configured. The Sites integration manages the real D1 binding and database migrations. The generated local Wrangler configuration contains a placeholder database identifier and must not be used directly as a production deployment configuration.

## Local development

Run `npm run dev` for the development preview. Generate database migrations with `npm run db:generate` only after database schema changes. Build once and apply unapplied migrations to the local database before testing persistence; see the local D1 instructions in README.md. Never copy local test databases into a production deployment.

## Hosting elsewhere

The app needs a server and persistent D1 storage; GitHub Pages or other static-only hosting is insufficient. Moving to another Cloudflare account requires a real Worker/D1 configuration, migration of existing data, and the same Google client configuration with the new origin registered. Keep the server authentication checks enabled.

## Mobile behavior

The layout supports small screens, touch controls, room selection without scrolling through every room card, and scrolling dialogs when the keyboard is open. Browser zoom remains enabled. An internet connection is required to load and save shared records; offline editing is not implemented.
