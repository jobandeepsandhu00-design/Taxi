import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "tp_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 Tage

export interface SessionPayload {
  sub: string;
  role: "STUDENT" | "ADMIN";
  name: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET fehlt oder ist kürzer als 32 Zeichen.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .setIssuer("taxi-pruefung")
    .sign(getSecret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: "taxi-pruefung", algorithms: ["HS256"] });
    if (!payload.sub || (payload.role !== "STUDENT" && payload.role !== "ADMIN")) return null;
    return { sub: payload.sub, role: payload.role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
