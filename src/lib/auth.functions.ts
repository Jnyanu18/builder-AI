import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const bypassSignup = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
      id: created.user!.id,
      display_name: data.email.split("@")[0],
      avatar_url: null,
    });

    if (profileErr) {
      throw new Error(profileErr.message);
    }

    return { success: true };
  });
