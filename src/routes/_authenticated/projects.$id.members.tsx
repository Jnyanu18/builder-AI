import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProject } from "@/lib/projects.functions";
import { listMembers, listInvites, inviteMember, removeMember } from "@/lib/members.functions";
import { ProjectTabs } from "@/components/project-tabs";
import { useState } from "react";
import { Users, Mail, Trash2, UserPlus, Crown, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects/$id/members")({
  head: () => ({ meta: [{ title: "Members — IntentOS" }] }),
  component: MembersPage,
});

function MembersPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getProjectFn = useServerFn(getProject);
  const listMembersFn = useServerFn(listMembers);
  const listInvitesFn = useServerFn(listInvites);
  const inviteFn = useServerFn(inviteMember);
  const removeFn = useServerFn(removeMember);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProjectFn({ data: { id } }),
  });
  const { data: members } = useQuery({
    queryKey: ["members", id],
    queryFn: () => listMembersFn({ data: { projectId: id } }),
  });
  const { data: invites } = useQuery({
    queryKey: ["invites", id],
    queryFn: () => listInvitesFn({ data: { projectId: id } }),
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");

  const invite = useMutation({
    mutationFn: () => inviteFn({ data: { projectId: id, email, role } }),
    onSuccess: (r) => {
      toast.success(r.added ? `${r.email} added` : `Invite saved for ${r.email}`);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["members", id] });
      qc.invalidateQueries({ queryKey: ["invites", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => removeFn({ data: { projectId: id, userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", id] }),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-2 text-sm">
        <Link to="/projects" className="text-muted-foreground hover:text-foreground">
          ← Projects
        </Link>
      </div>
      <h1 className="text-3xl font-display font-bold tracking-tight">{project?.name}</h1>
      <p className="text-muted-foreground mt-1">Team members and access.</p>
      <ProjectTabs projectId={id} />

      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <UserPlus className="h-4 w-4 text-primary" /> Invite a teammate
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email) invite.mutate();
          }}
          className="flex flex-wrap gap-2"
        >
          <input
            type="email"
            required
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 min-w-[240px] rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            disabled={invite.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {invite.isPending ? "Sending…" : "Invite"}
          </button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Existing users join immediately. Others receive a pending invite that activates when they
          sign up.
        </p>
      </div>

      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-primary" /> Members
        </h2>
        <div className="divide-y divide-border/60">
          {(members ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3">
              <Avatar
                name={m.profile?.display_name ?? "User"}
                url={m.profile?.avatar_url ?? null}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {m.profile?.display_name ?? "Unnamed"}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {m.user_id.slice(0, 8)}…
                </div>
              </div>
              <RoleBadge role={m.role as string} />
              {m.role !== "owner" && (
                <button
                  onClick={() => remove.mutate(m.user_id)}
                  className="text-muted-foreground hover:text-destructive p-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {(invites?.length ?? 0) > 0 && (
        <div className="glass rounded-xl p-6">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-primary" /> Pending invites
          </h2>
          <div className="divide-y divide-border/60">
            {invites!.map((i) => (
              <div key={i.id} className="flex items-center gap-3 py-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{i.email}</span>
                <RoleBadge role={i.role} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isOwner = role === "owner";
  const Icon = isOwner ? Crown : Shield;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${isOwner ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground"}`}
    >
      <Icon className="h-3 w-3" /> {role}
    </span>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="h-9 w-9 rounded-full object-cover" />;
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm">
      {initial}
    </div>
  );
}
