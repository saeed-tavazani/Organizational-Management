import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import { resolveAuthSecret } from "../utils/auth-secret";

function key() {
  return createHash("sha256")
    .update(`montask:bale:v1:${resolveAuthSecret()}`)
    .digest();
}
export function hashPhoneCode(value: string) {
  return createHmac("sha256", key()).update(value).digest("hex");
}
export function encryptBalePayload(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), data]
    .map((part) => part.toString("base64url"))
    .join(".");
}
export function decryptBalePayload<T>(value: string): T {
  const [iv, tag, data] = value
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !data) throw new Error("Invalid Bale payload");
  const cipher = createDecipheriv("aes-256-gcm", key(), iv);
  cipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([cipher.update(data), cipher.final()]).toString(),
  );
}
