import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";
const route = client["bale-integration"].project[":projectId"];
export type CreateBaleIntegrationRequest = InferRequestType<
  typeof route.$post
>["json"];
export default async function createBaleIntegration(
  projectId: string,
  json: CreateBaleIntegrationRequest,
) {
  const response = await route.$post({ param: { projectId }, json });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
