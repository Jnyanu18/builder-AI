import { createStart, createMiddleware } from "@tanstack/react-start";

if (typeof window === "undefined" && typeof globalThis.WebSocket === "undefined") {
  import("ws").then((wsModule) => {
    globalThis.WebSocket = (wsModule.default || wsModule) as any;
  }).catch((err) => {
    console.error("Failed to load ws polyfill:", err);
  });
}

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
