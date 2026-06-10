import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/app-sidebar";
import { DemoTour } from "@/components/demo-tour";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
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
