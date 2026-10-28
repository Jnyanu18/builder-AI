import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth.functions";
import { AppSidebar } from "@/components/app-sidebar";
import { DemoTour } from "@/components/demo-tour";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const [email, setEmail] = useState<string | undefined>(user?.email);
  useEffect(() => {
    setEmail(user?.email);
  }, [user]);
  return (
    <div className="min-h-screen flex">
      <AppSidebar userEmail={email} />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
      <DemoTour userEmail={email} />
    </div>
  );
}
