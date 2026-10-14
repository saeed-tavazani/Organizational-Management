import { useQuery } from "@tanstack/react-query";
import getBaleIntegration from "@/fetchers/bale-integration/get-bale-integration";

function useGetBaleIntegration(
  projectId: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["bale-integration", projectId],
    queryFn: () => getBaleIntegration(projectId),
    enabled: enabled && Boolean(projectId),
  });
}

export default useGetBaleIntegration;
