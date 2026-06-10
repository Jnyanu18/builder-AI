import { Link, useRouterState } from "@tanstack/react-router";
import { FileCheck2, GitBranch, ShieldCheck, Inbox } from "lucide-react";

export function ProjectTabs({ projectId }: { projectId: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: `/projects/${projectId}/blueprint`, label: "Blueprint", icon: FileCheck2 },
    { to: `/projects/${projectId}/repository`, label: "Repository", icon: GitBranch },
    { to: `/projects/${projectId}/alignment`, label: "Alignment", icon: ShieldCheck },
    { to: `/projects/${projectId}/approvals`, label: "Approvals", icon: Inbox },
  ];
  return (
    <div className="flex flex-wrap gap-1 border-b border-border/60 mb-6">
      {tabs.map((t) => {
        const active = path === t.to;
        const Icon = t.icon;
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors -mb-px ${
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
