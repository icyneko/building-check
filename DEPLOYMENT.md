# Deployment and mobile access

## Existing live deployment

Room Rounds is already deployed at https://room-rounds-checklists.icyneko.chatgpt.site using Sites hosting, a Cloudflare Worker, and a D1 database. It does not depend on a computer running a local preview. Open the HTTPS URL in a modern phone or tablet browser; no app-store installation is needed.

The deployment currently restricts access to the owner. Use the site's sharing/access settings to invite people. The app does not currently separate administrator and checker permissions: anyone granted app access can use the configuration controls. Making it public would expose those controls and named check-in records to visitors.

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

The app needs a server and persistent D1 storage; GitHub Pages or other static-only hosting is insufficient. Moving to another Cloudflare account requires a real Worker/D1 configuration, migration of existing data, and replacement access controls. Sites sign-in/access restrictions do not automatically transfer to a different host.

## Mobile behavior

The layout supports small screens, touch controls, room selection without scrolling through every room card, and scrolling dialogs when the keyboard is open. Browser zoom remains enabled. An internet connection is required to load and save shared records; offline editing is not implemented.
