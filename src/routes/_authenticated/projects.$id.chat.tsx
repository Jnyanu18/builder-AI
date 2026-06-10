import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProject } from "@/lib/projects.functions";
import { listChat, sendChat } from "@/lib/chat.functions";
import { ProjectTabs } from "@/components/project-tabs";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/projects/$id/chat")({
  head: () => ({ meta: [{ title: "Chat — IntentOS" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getProjectFn = useServerFn(getProject);
  const listFn = useServerFn(listChat);
  const sendFn = useServerFn(sendChat);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProjectFn({ data: { id } }),
  });
  const { data: messages } = useQuery({
    queryKey: ["chat", id],
    queryFn: () => listFn({ data: { projectId: id } }),
  });

  const [input, setInput] = useState("");
  const [askAi, setAskAi] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    inputRef.current?.focus();
  }, [id]);

  useEffect(() => {
    const ch = supabase
      .channel(`chat:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `project_id=eq.${id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["chat", id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  const send = useMutation({
    mutationFn: (content: string) => sendFn({ data: { projectId: id, content, askAi } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", id] });
    },
  });

  function submit() {
    const v = input.trim();
    if (!v || send.isPending) return;
    setInput("");
    send.mutate(v);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
      <div className="mb-2 text-sm">
        <Link to="/projects" className="text-muted-foreground hover:text-foreground">
          ← Projects
        </Link>
      </div>
      <h1 className="text-3xl font-display font-bold tracking-tight">{project?.name}</h1>
      <p className="text-muted-foreground mt-1">Team chat with IntentBot.</p>
      <ProjectTabs projectId={id} />

      <div className="glass rounded-xl flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(messages?.length ?? 0) === 0 && (
            <div className="text-center text-muted-foreground text-sm py-16">
              <Sparkles className="h-8 w-8 mx-auto text-primary mb-3" />
              Start a conversation. Toggle <strong>Ask IntentBot</strong> below for AI replies that
              know your blueprint and drift.
            </div>
          )}
          {(messages ?? []).map((m) => (
            <Message key={m.id} message={m} />
          ))}
          {send.isPending && askAi && (
            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="text-sm text-muted-foreground animate-pulse">
                IntentBot is thinking…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={askAi}
                onChange={(e) => setAskAi(e.target.checked)}
                className="accent-primary"
              />
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Ask IntentBot
            </label>
          </div>
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={askAi ? "Ask IntentBot or the team…" : "Message the team…"}
              className="flex-1 resize-none rounded-lg border border-border bg-background/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={submit}
              disabled={!input.trim() || send.isPending}
              className="self-end inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ChatMessage = {
  id: string;
  is_ai: boolean;
  content: string;
  created_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
};

function Message({ message: m }: { message: ChatMessage }) {
  const ai = m.is_ai;
  const name = ai ? "IntentBot" : (m.profile?.display_name ?? "User");
  return (
    <div className="flex gap-3 items-start">
      {ai ? (
        <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4" />
        </div>
      ) : m.profile?.avatar_url ? (
        <img
          src={m.profile.avatar_url}
          alt=""
          className="h-8 w-8 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-accent text-foreground flex items-center justify-center text-xs font-semibold shrink-0">
          {(name || "?").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`text-sm font-medium ${ai ? "text-primary" : ""}`}>{name}</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {new Date(m.created_at).toLocaleTimeString()}
          </span>
        </div>
        <div className="prose prose-sm prose-invert max-w-none text-sm mt-0.5 text-foreground/90">
          <ReactMarkdown>{m.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
