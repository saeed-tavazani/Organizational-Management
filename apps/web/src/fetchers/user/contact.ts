import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export async function sendContactEmail(email: string) {
  const response = await client.user.contact.email.$post({ json: { email } });
  if (!response.ok) throw await HttpError.fromResponse(response);
}
export async function verifyContactEmail(code: string) {
  const response = await client.user.contact.email.verify.$post({
    json: { code },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
}
export async function removeContactEmail() {
  const response = await client.user.contact.email.$delete();
  if (!response.ok) throw await HttpError.fromResponse(response);
}
export async function getBaleDeliveries() {
  const response = await client.user["bale-deliveries"].$get();
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
