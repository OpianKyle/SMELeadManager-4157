# Masakhe Group – Email Automation Portal

A CRM and lead management system with integrated email automation for Masakhe Group (Pty) Ltd.

## Stack

- **Runtime:** Bun
- **Frontend:** React 19, Tailwind CSS 4, Wouter (routing), TanStack Query
- **Backend:** Hono (API server, served via Vite dev plugin in dev mode)
- **Database:** MySQL via mysql2 + Drizzle ORM
- **Auth:** Better Auth (email/password, with password reset via email)
- **Email:** Nodemailer (SMTP)
- **AI:** OpenRouter (via `@ai-sdk/openai`)
- **Build tool:** Vite 8 + Turborepo monorepo

## Project Structure

```
packages/web/       — Main web app (frontend + backend API)
  src/api/          — Hono backend: auth, routes, database, mailer, automation
  src/web/          — React frontend: pages, components, hooks
  vite/plugins/     — Custom Vite plugins (Hono dev server, analytics)
packages/mobile/    — Expo mobile app
packages/desktop/   — Electron desktop wrapper
scripts/            — Build utilities
```

## Running the App

The app starts automatically via the **Start application** workflow, which runs:
```
cd packages/web && bunx vite
```
Serves on port **5000**.

## Required Environment Secrets

All secrets are configured in Replit's Secrets tab:

| Secret | Purpose |
|---|---|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | MySQL database connection |
| `BETTER_AUTH_SECRET` | Auth session signing key |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Email sending |
| `OPENROUTER_API_KEY` | AI features |

## Key Features

- **Lead management:** Track leads through stages (initial contact → product intro → demo scheduling → booked → completed)
- **Email automation:** Automated multi-stage email campaigns with configurable delays
- **User roles:** super_admin, admin (distributor), agent, viewer
- **Activity logging:** Full audit trail of all user actions
- **Media management:** File uploads via AWS S3
- **Google OAuth:** Calendar/email integration

## User Preferences

- Keep all secrets/credentials in Replit Secrets (never hardcoded)
- Use Bun as the package manager (not npm or yarn)
- Maintain the monorepo structure under `packages/`
