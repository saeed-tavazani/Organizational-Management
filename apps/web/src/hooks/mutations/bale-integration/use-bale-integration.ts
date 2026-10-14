import { useMutation, useQueryClient } from "@tanstack/react-query";
import createBaleIntegration, {
  type CreateBaleIntegrationRequest,
} from "@/fetchers/bale-integration/create-bale-integration";
import deleteBaleIntegration from "@/fetchers/bale-integration/delete-bale-integration";
import updateBaleIntegration, {
  type UpdateBaleIntegrationRequest,
} from "@/fetchers/bale-integration/update-bale-integration";

export function useCreateBaleIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: CreateBaleIntegrationRequest;
    }) => createBaleIntegration(projectId, data),
    onSuccess: (_, { projectId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["bale-integration", projectId],
      });
    },
  });
}

export function useUpdateBaleIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      json,
    }: {
      projectId: string;
      json: UpdateBaleIntegrationRequest;
    }) => updateBaleIntegration(projectId, json),
    onSuccess: (_, { projectId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["bale-integration", projectId],
      });
    },
  });
}

export function useDeleteBaleIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => deleteBaleIntegration(projectId),
    onSuccess: (_, projectId) => {
      void queryClient.invalidateQueries({
        queryKey: ["bale-integration", projectId],
      });
    },
  });
}
