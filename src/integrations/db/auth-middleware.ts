import { createMiddleware } from "@tanstack/react-start";

/** Requires a valid session cookie; provides `context.db` (access-scoped) and `context.userId`. */
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { getSessionUserId } = await import("./auth.server");
  const { createUserDb } = await import("./client.server");
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Unauthorized: please sign in");
  return next({ context: { db: createUserDb(userId), userId } });
});
