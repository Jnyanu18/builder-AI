import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getCurrentUser, signIn, signUp } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — IntentOS" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const signUpFn = useServerFn(signUp);
  const signInFn = useServerFn(signIn);
  const currentUserFn = useServerFn(getCurrentUser);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    currentUserFn().then((user) => {
      if (user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate, currentUserFn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpFn({ data: { email, password } });
        toast.success("Account created. Signing you in…");
      } else {
        await signInFn({ data: { email, password } });
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-display font-bold">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Welcome back to IntentOS."
              : "Start verifying your software intent."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={async () => {
              setLoading(true);
              try {
                const res = await fetch("/api/public/demo-login", { method: "POST" });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Demo login failed");
                await signInFn({ data: { email: json.email, password: json.password } });
                toast.success(
                  "Signed in as demo user. Open the seeded project to see the full flow.",
                );
                navigate({ to: "/dashboard", replace: true });
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            ✨ Explore as Demo User
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Fully seeded: approved blueprint, connected repo, drift report, pending approvals.
          </p>
        </div>
      </div>
    </div>
  );
}
