import { Link } from "@tanstack/react-router";
import { Hexagon } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Hexagon className="h-7 w-7 text-primary" strokeWidth={1.5} />
        <div className="absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-primary glow-ring" />
      </div>
      <div className="leading-none">
        <div className="font-display text-lg font-semibold tracking-tight text-foreground">
          Intent<span className="text-primary">OS</span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          intent verification
        </div>
      </div>
    </Link>
  );
}
