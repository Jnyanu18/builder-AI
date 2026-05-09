# BuildLens AI

BuildLens AI analyzes repository evolution against implementation plans to identify engineering progress, implementation gaps, and architecture drift directly from code structure.

## MVP

- Clone public GitHub repositories
- Scan repository files
- Generate dependency graphs
- Detect risky files
- Summarize architecture with Gemini when an API key is configured
- Compare markdown implementation plans against actual code signals

## Run

```bash
npm install
npm run dev
```

Backend: `http://localhost:5000`

Frontend:

```bash
cd client
npm install
npm run dev
```
