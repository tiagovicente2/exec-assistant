import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

function base64url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", config.APP_ENCRYPTION_KEY).update(value).digest("base64url");
}

export function safeTokenEquals(actual: string | undefined, expected: string) {
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createSignedState() {
  const payload = base64url(JSON.stringify({ nonce: randomBytes(16).toString("hex"), exp: Date.now() + 10 * 60 * 1000 }));
  return `${payload}.${sign(payload)}`;
}

export function verifySignedState(state: string | undefined) {
  if (!state) return false;
  const [payload, signature] = state.split(".");
  if (!payload || !signature || !safeTokenEquals(signature, sign(payload))) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof decoded.exp === "number" && decoded.exp >= Date.now();
  } catch {
    return false;
  }
}
