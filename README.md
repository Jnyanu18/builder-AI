# IntentOS

AI-native intent verification for software projects.

IntentOS compares an approved project blueprint with the actual state of a GitHub repository, detects drift, and turns every finding into an explicit approval decision.

In one line: **Git for product intent: versioned, diffable, and approval-gated.**

## What It Does

- Creates versioned project blueprints for product intent.
- Connects GitHub repositories and scans implementation reality.
- Uses Groq-powered AI to generate structured reality models.
- Compares blueprint vs repository state and produces drift reports.
- Tracks missing, unexpected, partial, and violating changes.
- Converts drift findings into pending approvals.
- Evolves the blueprint only after human approval.
- Maintains a full change history timeline.
- Includes a demo user flow and seeded sample project.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | TanStack Start, React 19, Vite 7 |
| Routing | TanStack Router |
| Data | TanStack Query, TanStack server functions |
| Styling | Tailwind CSS v4, shadcn/ui, Radix |
| Database | Supabase Postgres |
| Auth | Supabase Auth |
| AI | Groq, Vercel AI SDK |
| Deployment | Vercel |

## Local Setup

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Fill in:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
```

Run locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Supabase Setup

The database schema and policies are in:

```text
supabase/migrations/
```

Apply the migrations to your Supabase project using the Supabase SQL editor or Supabase CLI.

The service-role key is required only on the server. Do not expose it in client code.

## Deployment

This project is configured for Vercel through Nitro:

```text
vite.config.ts
vercel.json
```

Required Vercel environment variables:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
NITRO_PRESET=vercel
```

## Project Structure

```text
src/
├── routes/                    # File-based routes and public APIs
├── lib/                       # Server functions, AI logic, shared schemas
├── integrations/supabase/     # Supabase clients and auth middleware
├── components/                # UI components
└── styles.css                 # Tailwind theme tokens

supabase/migrations/           # Database schema and RLS policies
vscode-extension/              # Companion VS Code extension scaffold
```

## Repository

https://github.com/Jnyanu18/builder-AI

