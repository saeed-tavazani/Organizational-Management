import { afterEach, expect, it, vi } from "vite-plus/test";
import {
  decryptBalePayload,
  encryptBalePayload,
  hashPhoneCode,
} from "./crypto";

afterEach(() => vi.unstubAllEnvs());
it("encrypts sensitive delivery payloads and detects tampering", () => {
  vi.stubEnv("AUTH_SECRET", "bale-test-secret-with-at-least-32-characters");
  const payload = { otp: "123456", url: "https://example.com/secret" };
  const encrypted = encryptBalePayload(payload);
  expect(encrypted).not.toContain("123456");
  expect(encrypted).not.toContain("secret");
  expect(decryptBalePayload(encrypted)).toEqual(payload);
  const parts = encrypted.split(".");
  parts[1] = Buffer.alloc(16).toString("base64url");
  expect(() => decryptBalePayload(parts.join("."))).toThrow();
  expect(hashPhoneCode("challenge:123456")).not.toBe(
    hashPhoneCode("another:123456"),
  );
});
