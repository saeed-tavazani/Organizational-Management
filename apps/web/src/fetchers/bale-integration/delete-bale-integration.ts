import { client } from "@kaneo/libs";
import { HttpError } from "@/lib/http-error";
export default async function deleteBaleIntegration(projectId: string) {
  const response = await client["bale-integration"].project[
    ":projectId"
  ].$delete({ param: { projectId } });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
