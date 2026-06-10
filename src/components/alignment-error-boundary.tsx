import { Component, type ReactNode, type ErrorInfo } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

type Props = {
  projectId: string;
  /** Snapshot of the data being rendered when a crash occurs. */
  debugPayload?: unknown;
  children: ReactNode;
};

type State = { error: Error | null };

/**
 * Error boundary scoped to the alignment render path. Captures the exact
 * findings payload + stack so future regressions can be diagnosed without
 * having to repro locally. Reports go to:
 *   1. console.error (visible in browser + lovable preview log capture)
 *   2. window.__lovableEvents (Lovable's runtime error stream)
 */
export class AlignmentErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const payloadSnapshot = safeSerialize(this.props.debugPayload);

    // Structured console group so the payload is grep-able in logs.
    // eslint-disable-next-line no-console
    console.group("%c[alignment] render crash", "color:#f43f5e;font-weight:bold");
    // eslint-disable-next-line no-console
    console.error("error:", error);
    // eslint-disable-next-line no-console
    console.error("componentStack:", info.componentStack);
    // eslint-disable-next-line no-console
    console.error("projectId:", this.props.projectId);
    // eslint-disable-next-line no-console
    console.error("payload:", payloadSnapshot);
    // eslint-disable-next-line no-console
    console.groupEnd();

    reportLovableError(error, {
      area: "alignment",
      projectId: this.props.projectId,
      componentStack: info.componentStack,
      payload: payloadSnapshot,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="glass mx-8 my-12 rounded-2xl border border-danger/40 p-8">
          <div className="text-[10px] font-mono uppercase tracking-widest text-danger">
            Alignment render error
          </div>
          <h2 className="mt-2 font-display text-xl font-semibold">
            We couldn't render this drift report.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The error has been logged with the failing payload. You can retry the analysis or reload
            — your data is safe.
          </p>
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-border/60 bg-background/40 p-3 text-xs font-mono whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-accent/40"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function safeSerialize(value: unknown): unknown {
  try {
    // Round-trip through JSON to strip non-serializable bits (functions,
    // class instances, circular refs) so the payload survives transport.
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    return { __serializationFailed: true, message: (err as Error).message };
  }
}
