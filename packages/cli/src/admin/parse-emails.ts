import { Result } from "effect";
import { InvalidArgument } from "../errors/errors.js";

const PHONE = /^\+?989\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function parseEmails(
  inputs: ReadonlyArray<string>,
): Result.Result<ReadonlyArray<string>, InvalidArgument> {
  const emails = inputs
    .flatMap((input) => input.split(","))
    .map((value) => {
      const raw = value
        .trim()
        .replace(/[۰-۹٠-٩]/g, (digit) =>
          String(digit.charCodeAt(0) - (digit >= "۰" ? 0x6f0 : 0x660)),
        );
      const number = raw
        .replace(/[\s()-]/g, "")
        .replace(/^(?:\+98|0098|98|0)/, "");
      return /^9\d{9}$/.test(number) ? "+98" + number : raw.toLowerCase();
    })
    .filter(Boolean);
  const invalid = emails.filter(
    (email) => !EMAIL.test(email) && !PHONE.test(email),
  );
  if (invalid.length > 0) {
    return Result.fail(
      new InvalidArgument({
        message:
          invalid.length === 1
            ? `"${invalid[0]}" is not an email address or Iranian mobile number.`
            : `These are not email addresses or Iranian mobile numbers: ${invalid.join(", ")}.`,
        hint: "Pass addresses such as grace@example.com, separated by spaces.",
      }),
    );
  }
  if (emails.length === 0) {
    return Result.fail(
      new InvalidArgument({
        message: "Who should be invited?",
        hint: "Pass one or more email addresses, for example kaneo member invite grace@example.com.",
      }),
    );
  }
  return Result.succeed([...new Set(emails)]);
}
