// Server-only session handling: bcrypt password hashes + signed JWT in an httpOnly cookie.
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

export const SESSION_COOKIE = "intentos_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Missing AUTH_SECRET (min 32 chars). Generate one with: openssl rand -hex 32");
  return new TextEncoder().encode(secret);
}

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export async function startSession(userId: string) {
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secretKey());
  setCookie(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export function endSession() {
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

/** Returns the signed-in user id from the session cookie, or null. */
export async function getSessionUserId(): Promise<string | null> {
  const jwt = getCookie(SESSION_COOKIE);
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
