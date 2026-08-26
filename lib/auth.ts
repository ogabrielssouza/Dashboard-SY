import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "d6_session";

function secret(): string {
  const s = process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("ADMIN_PASSWORD é obrigatória");
  return s;
}

// Sessão sem estado: o valor do cookie é um HMAC fixo derivado da senha.
// Trocar a senha invalida todas as sessões.
export function sessionValue(): string {
  return createHmac("sha256", secret()).update("d6-session-v1").digest("hex");
}

export function isValidSession(value: string | undefined): boolean {
  if (!value) return false;
  const expected = sessionValue();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isValidPassword(password: string): boolean {
  const a = Buffer.from(password);
  const b = Buffer.from(secret());
  return a.length === b.length && timingSafeEqual(a, b);
}
