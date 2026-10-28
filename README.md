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
| Database | MongoDB (Atlas) |
| Auth | Email/password, bcrypt + signed JWT cookie |
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
MONGODB_URI=
MONGODB_DB=intentos
AUTH_SECRET=      # min 32 chars: openssl rand -hex 32
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

## MongoDB Setup

Create a free MongoDB Atlas cluster, allow your IP under Network Access, and put the connection string in `MONGODB_URI`. Collections and indexes are created automatically on first use. Access control (project owner/member rules) is enforced in `src/integrations/db/client.server.ts`.

## Deployment

This project is configured for Vercel through Nitro:

```text
vite.config.ts
vercel.json
```

Required Vercel environment variables:

```bash
MONGODB_URI
MONGODB_DB
AUTH_SECRET
GROQ_API_KEY
NITRO_PRESET=vercel
```

## Project Structure

```text
src/
├── routes/                    # File-based routes and public APIs
├── lib/                       # Server functions, AI logic, shared schemas
├── integrations/db/           # MongoDB access layer, sessions, auth middleware
├── components/                # UI components
└── styles.css                 # Tailwind theme tokens

vscode-extension/              # Companion VS Code extension scaffold
```

## Repository

https://github.com/Jnyanu18/builder-AI

