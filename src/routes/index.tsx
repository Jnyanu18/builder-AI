import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  GitBranch,
  FileCheck2,
  ArrowRight,
  GitCompare,
  Eye,
  Lock,
} from "lucide-react";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IntentOS — The Verification Layer for AI-Built Software" },
      {
        name: "description",
        content:
          "Git tracks code. GitHub tracks collaboration. IntentOS tracks intent — and verifies your codebase still matches it.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen grid-bg">
      <header className="border-b border-border/40 bg-background/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-primary mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Intent Verification Platform
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tighter">
          The verification layer
          <br />
          <span className="text-gradient">between intent and code.</span>
        </h1>
        <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          AI generates code fast. IntentOS verifies that what got built still matches what you
          actually planned — and gates every drift behind explicit human approval.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground glow-ring hover:scale-[1.02] transition-transform"
          >
            Start verifying <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-accent/40 transition-colors"
          >
            How it works
          </a>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {[
            { label: "Git tracks", value: "code history" },
            { label: "GitHub tracks", value: "collaboration" },
            { label: "IntentOS tracks", value: "intent", highlight: true },
          ].map((c) => (
            <div
              key={c.label}
              className={`glass rounded-xl p-6 ${c.highlight ? "border-primary/40 glow-ring" : ""}`}
            >
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {c.label}
              </div>
              <div
                className={`mt-2 text-2xl font-display font-semibold ${c.highlight ? "text-primary" : ""}`}
              >
                {c.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="max-w-6xl mx-auto px-6 py-20 border-t border-border/40">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-center">
          Six steps. One source of truth.
        </h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              n: "01",
              icon: FileCheck2,
              t: "Define the blueprint",
              d: "Vision, features, architecture, constraints — the immutable spec for what you're building.",
            },
            {
              n: "02",
              icon: GitBranch,
              t: "Connect your repository",
              d: "Point IntentOS at any GitHub repo. Public or private with a token.",
            },
            {
              n: "03",
              icon: Eye,
              t: "Scan the reality",
              d: "We extract the actual tech stack, services, and features from your code.",
            },
            {
              n: "04",
              icon: GitCompare,
              t: "Detect drift",
              d: "AI compares blueprint vs reality across features, architecture, technology and scope.",
            },
            {
              n: "05",
              icon: ShieldCheck,
              t: "Review findings",
              d: "Severity-ranked report — what's missing, what was added, what changed.",
            },
            {
              n: "06",
              icon: Lock,
              t: "Approve or reject",
              d: "Every change is gated. Approved drift becomes Blueprint V2. Nothing slips through.",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="glass glass-hover rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
                </div>
                <h3 className="mt-4 text-lg font-display font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        IntentOS captures intent. Stores blueprints. Detects drift. Requires approval. Nothing else.
      </footer>
    </div>
  );
}
