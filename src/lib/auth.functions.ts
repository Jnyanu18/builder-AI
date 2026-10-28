import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const credentials = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(6).max(200),
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => credentials.parse(d))
  .handler(async ({ data }) => {
    const { db, findUserByEmail, insertUser } = await import("@/integrations/db/client.server");
    const { hashPassword, startSession } = await import("@/integrations/db/auth.server");
    if (await findUserByEmail(data.email)) throw new Error("An account with this email already exists");
    const user = await insertUser(data.email, await hashPassword(data.password));
    await db.from("profiles").upsert({ id: user.id, display_name: data.email.split("@")[0] });
    await startSession(user.id);
    return { id: user.id, email: user.email };
  });

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => credentials.parse(d))
  .handler(async ({ data }) => {
    const { findUserByEmail } = await import("@/integrations/db/client.server");
    const { checkPassword, startSession } = await import("@/integrations/db/auth.server");
    const user = await findUserByEmail(data.email);
    if (!user || !(await checkPassword(data.password, user.password_hash)))
      throw new Error("Invalid email or password");
    await startSession(user.id);
    return { id: user.id, email: user.email };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { endSession } = await import("@/integrations/db/auth.server");
  endSession();
  return { ok: true };
});

/** Current user from the session cookie, or null when signed out. */
export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionUserId } = await import("@/integrations/db/auth.server");
  const { findUserById } = await import("@/integrations/db/client.server");
  const id = await getSessionUserId();
  if (!id) return null;
  const user = await findUserById(id);
  return user ? { id: user.id, email: user.email } : null;
});
