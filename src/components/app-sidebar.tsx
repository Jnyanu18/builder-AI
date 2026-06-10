import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  BookOpen,
  MessageSquare,
  Users,
  History as HistoryIcon,
  FolderOpen,
} from "lucide-react";
import { Logo } from "./logo";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function AppSidebar({ userEmail }: { userEmail?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // Detect current project from URL: /projects/:id/...
  const projectMatch = path.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1];

  const globalLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects", label: "Projects", icon: FolderKanban },
  ];

  const projectLinks = projectId
    ? [
        { to: `/projects/${projectId}`, label: "Overview", icon: FolderOpen, exact: true },
        { to: `/projects/${projectId}/docs`, label: "Docs", icon: BookOpen },
        { to: `/projects/${projectId}/chat`, label: "Chat", icon: MessageSquare },
        { to: `/projects/${projectId}/members`, label: "Members", icon: Users },
        { to: `/projects/${projectId}/history`, label: "History", icon: HistoryIcon },
      ]
    : [];

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col gap-2 border-r border-border/60 bg-sidebar/60 backdrop-blur-xl">
      <div className="p-5 border-b border-border/60">
        <Logo />
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          General
        </div>
        {globalLinks.map((l) => {
          const active = path === l.to || (l.to !== "/dashboard" && path.startsWith(l.to));
          const Icon = l.icon;
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                active
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-primary shadow-[0_0_8px_var(--primary)]" />
              )}
              <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
              {l.label}
            </Link>
          );
        })}

        {projectLinks.length > 0 && (
          <>
            <div className="mt-5 mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Workspace
            </div>
            {projectLinks.map((l) => {
              const active = l.exact ? path === l.to : path === l.to || path.startsWith(l.to + "/");
              const Icon = l.icon;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                    active
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-primary shadow-[0_0_8px_var(--primary)]" />
                  )}
                  <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                  {l.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-border/60 space-y-2">
        <div className="px-3 py-2 text-xs text-muted-foreground truncate">{userEmail}</div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
