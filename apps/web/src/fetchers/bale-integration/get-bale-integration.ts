import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";
const route = client["bale-integration"].project[":projectId"];
export type BaleIntegration = InferResponseType<typeof route.$get, 200>;
export default async function getBaleIntegration(projectId: string) {
  const response = await route.$get({ param: { projectId } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
