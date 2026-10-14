import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";
const route = client["bale-integration"].project[":projectId"];
export type UpdateBaleIntegrationRequest = InferRequestType<
  typeof route.$patch
>["json"];
export default async function updateBaleIntegration(
  projectId: string,
  json: UpdateBaleIntegrationRequest,
) {
  const response = await route.$patch({ param: { projectId }, json });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
