import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHistory } from "@/lib/history.functions";
import { ProjectTabs } from "@/components/project-tabs";
import { Circle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/$id/history")({
  head: () => ({ meta: [{ title: "History — IntentOS" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { id } = useParams({ from: "/_authenticated/projects/$id/history" });
  const fn = useServerFn(listHistory);
  const { data } = useQuery({
    queryKey: ["history", id],
    queryFn: () => fn({ data: { projectId: id } }),
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-display font-bold tracking-tight">Change History</h1>
      <ProjectTabs projectId={id} />

      {!data || data.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-muted-foreground">
          No events yet.
        </div>
      ) : (
        <div className="glass rounded-xl p-6">
          <div className="space-y-4 relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
            {data.map((e) => (
              <div key={e.id} className="flex gap-4 relative">
                <Circle className="h-4 w-4 text-primary fill-primary mt-1 z-10 shrink-0" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mt-1">
                    {e.event_type.replace(/_/g, " ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
