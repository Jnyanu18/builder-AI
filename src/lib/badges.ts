export function severityClass(sev: string) {
  switch (sev) {
    case "critical":
      return "bg-danger/20 text-danger border-danger/40";
    case "high":
      return "bg-warning/20 text-warning border-warning/40";
    case "medium":
      return "bg-info/20 text-info border-info/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
export function decisionClass(d: string) {
  switch (d) {
    case "approved":
      return "bg-success/20 text-success border-success/40";
    case "rejected":
      return "bg-danger/20 text-danger border-danger/40";
    default:
      return "bg-primary/15 text-primary border-primary/40";
  }
}
