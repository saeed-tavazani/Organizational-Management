import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";

export async function recoverPhone(userId: string, phoneNumber: string) {
  const response = await client.admin.users[":userId"]["recover-phone"].$post({
    param: { userId },
    json: { phoneNumber },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
}
