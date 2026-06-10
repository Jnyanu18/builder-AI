import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProjects } from "@/lib/projects.functions";
import { X, ArrowRight, Sparkles, ArrowLeft } from "lucide-react";

const DEMO_EMAIL = "demo@intentos.app";
const STORAGE_KEY = "intentos.demo.tour.v1";
const DEMO_PROJECT_NAME = "IntentOS Demo — Taskly App";

type Step = {
  title: string;
  body: string;
  to: string; // template, $id substituted
  cta: string;
};

const STEPS: Step[] = [
  {
    title: "Welcome to IntentOS",
    body: "This walkthrough takes you through the full loop: blueprint → scan → drift report → approvals. Everything below is real, seeded data — click around freely.",
    to: "/dashboard",
    cta: "Open the demo project",
  },
  {
    title: "Step 1 · Overview",
    body: "Every project starts here. The 5-step checklist shows how far the team has gotten: blueprint approved, repo connected, scan done, drift analyzed, approvals cleared.",
    to: "/projects/$id",
    cta: "Open the Blueprint",
  },
  {
    title: "Step 2 · Blueprint",
    body: "This is the approved plan: vision, personas, functional requirements, architecture, and milestones. Drift is measured against THIS document.",
    to: "/projects/$id/blueprint",
    cta: "See the connected repo",
  },
  {
    title: "Step 3 · Repository",
    body: "The demo repo is connected, scanned at the latest commit, and ready for push-triggered re-scans via the webhook URL shown here.",
    to: "/projects/$id/repository",
    cta: "Run drift analysis",
  },
  {
    title: "Step 4 · Alignment",
    body: "The drift report compares the plan to the scanned code. Each finding cites the blueprint ref so you know exactly what's missing or partial.",
    to: "/projects/$id/alignment",
    cta: "Review approvals",
  },
  {
    title: "Step 5 · Approvals",
    body: "Each finding becomes an approval card. Accept it (update the blueprint), reject it (dismiss as noise), or leave it pending.",
    to: "/projects/$id/approvals",
    cta: "See the history",
  },
  {
    title: "Step 6 · History",
    body: "Every event above — project created, blueprint approved, scan completed, drift run, approval decided — is logged here for audit. That's the whole loop.",
    to: "/projects/$id/history",
    cta: "Finish tour",
  },
];

function buildPath(template: string, pid: string) {
  return template.replace("$id", pid);
}

export function DemoTour({ userEmail }: { userEmail?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const isDemo = userEmail === DEMO_EMAIL;

  const fn = useServerFn(listProjects);
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fn(),
    enabled: isDemo,
  });
  const demoProjectId =
    projects?.find((p) => p.name === DEMO_PROJECT_NAME)?.id ?? projects?.[0]?.id;

  useEffect(() => {
    if (!isDemo) return;
    if (typeof window === "undefined") return;
    const state = window.localStorage.getItem(STORAGE_KEY);
    if (state === "done" || state === "dismissed") return;
    setOpen(true);
  }, [isDemo]);

  if (!isDemo) return null;

  if (!open) {
    return (
      <button
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg hover:bg-primary/90"
      >
        <Sparkles className="h-3.5 w-3.5" /> Restart tour
      </button>
    );
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const needsProject = current.to.includes("$id");
  const targetPath = demoProjectId ? buildPath(current.to, demoProjectId) : current.to;
  const onPage = location.pathname === targetPath;
  const canAdvance = !needsProject || !!demoProjectId;

  function close(markDone = false) {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, markDone ? "done" : "dismissed");
    }
  }

  function goTo(path: string) {
    // Use href-style navigation; safe for dynamic routes without typed params.
    navigate({ href: path } as never);
  }

  function next() {
    if (isLast) {
      close(true);
      return;
    }
    const nextStep = step + 1;
    const nextS = STEPS[nextStep];
    const nextNeeds = nextS.to.includes("$id");
    if (nextNeeds && !demoProjectId) return;
    setStep(nextStep);
    const path = nextNeeds && demoProjectId ? buildPath(nextS.to, demoProjectId) : nextS.to;
    goTo(path);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-2rem))] glass rounded-2xl border border-primary/30 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
      <div className="relative px-5 pt-5 pb-3">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" />
            Guided tour · {step + 1} / {STEPS.length}
          </div>
          <button
            onClick={() => close(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 h-1 rounded-full bg-background/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-5 pb-5">
        <h3 className="font-display text-lg font-bold tracking-tight">{current.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{current.body}</p>

        {needsProject && !demoProjectId && (
          <p className="mt-3 text-xs text-amber-500">Loading your demo project…</p>
        )}

        {!onPage && canAdvance && (
          <Link
            to={targetPath}
            onClick={(e) => {
              e.preventDefault();
              goTo(targetPath);
            }}
            className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
          >
            Jump to this screen <ArrowRight className="h-3 w-3" />
          </Link>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              const prev = Math.max(0, step - 1);
              setStep(prev);
              const s = STEPS[prev];
              const path =
                s.to.includes("$id") && demoProjectId ? buildPath(s.to, demoProjectId) : s.to;
              goTo(path);
            }}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => close(false)}
              className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Skip
            </button>
            <button
              onClick={next}
              disabled={!canAdvance}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLast ? "Finish" : current.cta}
              {!isLast && <ArrowRight className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
