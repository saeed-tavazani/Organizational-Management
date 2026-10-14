import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export async function createPhoneInvitation(json: {
  workspaceId: string;
  phoneNumber: string;
  role: "member" | "admin" | "owner";
  resend?: boolean;
  projectAccess?: "all" | "selected";
  projectIds?: string[];
}) {
  const response = await client.invitation.phone.$post({ json });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
