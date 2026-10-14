import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { deletedSchema, projectIdParam } from "../integrations/schema";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { createBaleIntegration } from "./controllers/create-bale-integration";
import { updateBaleIntegration } from "./controllers/update-bale-integration";
import { deleteBaleIntegration } from "./controllers/delete-bale-integration";
import { getBaleIntegration } from "./controllers/get-bale-integration";
import { baleIntegrationSchema } from "./response";
import { createBaleBody, updateBaleBody } from "./schema";

const manageAccess = [
  workspaceAccess.fromProject("projectId"),
  requireWorkspacePermission({ workspace: ["manage_settings"] }),
];

const getBaleIntegrationRoute = createRoute({
  method: "get",
  operationId: "getBaleIntegration",
  path: "/project/{projectId}",
  tags: ["Bale"],
  summary: "Get Bale integration",
  description:
    "Get the Bale integration for a project, or null when none is configured.",
  middleware: [workspaceAccess.fromProject("projectId")] as const,
  request: { params: projectIdParam },
  responses: {
    200: jsonResponse(
      "Bale integration details, or null",
      baleIntegrationSchema.nullable(),
    ),
    403: errorResponse("No access to the project"),
    404: errorResponse("Project not found"),
  },
});

const createBaleIntegrationRoute = createRoute({
  method: "post",
  operationId: "createBaleIntegration",
  path: "/project/{projectId}",
  tags: ["Bale"],
  summary: "Create Bale integration",
  description:
    "Create or replace the Bale integration for a project. The bot token and chat are checked for shape only, not against Bale.",
  middleware: manageAccess,
  request: {
    params: projectIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: createBaleBody } },
    },
  },
  responses: {
    200: jsonResponse(
      "The stored integration",
      baleIntegrationSchema.nullable(),
    ),
    400: errorResponse("The bot token or chat failed validation"),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project not found"),
  },
});

const updateBaleIntegrationRoute = createRoute({
  method: "patch",
  operationId: "updateBaleIntegration",
  path: "/project/{projectId}",
  tags: ["Bale"],
  summary: "Update Bale integration",
  description:
    "Update the Bale integration. Omitted fields keep their current value; chatLabel accept null to clear them.",
  middleware: manageAccess,
  request: {
    params: projectIdParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateBaleBody } },
    },
  },
  responses: {
    200: jsonResponse(
      "The updated integration",
      baleIntegrationSchema.nullable(),
    ),
    400: errorResponse("The resulting config failed validation"),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project or Bale integration not found"),
  },
});

const deleteBaleIntegrationRoute = createRoute({
  method: "delete",
  operationId: "deleteBaleIntegration",
  path: "/project/{projectId}",
  tags: ["Bale"],
  summary: "Delete Bale integration",
  description: "Remove the Bale integration from a project.",
  middleware: manageAccess,
  request: { params: projectIdParam },
  responses: {
    200: jsonResponse("The integration was removed", deletedSchema),
    403: errorResponse(
      "No access to the project, or missing workspace:manage_settings",
    ),
    404: errorResponse("Project or Bale integration not found"),
  },
});

const baleIntegration = apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(getBaleIntegrationRoute, async (c) =>
    c.json(await getBaleIntegration(c.req.valid("param").projectId), 200),
  )
  .openapi(createBaleIntegrationRoute, async (c) =>
    c.json(
      await createBaleIntegration(
        c.req.valid("param").projectId,
        c.req.valid("json"),
        { userId: c.get("userId"), apiKeyId: c.get("apiKey")?.id },
      ),
      200,
    ),
  )
  .openapi(updateBaleIntegrationRoute, async (c) =>
    c.json(
      await updateBaleIntegration(
        c.req.valid("param").projectId,
        c.req.valid("json"),
        { userId: c.get("userId"), apiKeyId: c.get("apiKey")?.id },
      ),
      200,
    ),
  )
  .openapi(deleteBaleIntegrationRoute, async (c) =>
    c.json(
      await deleteBaleIntegration(c.req.valid("param").projectId, {
        userId: c.get("userId"),
        apiKeyId: c.get("apiKey")?.id,
      }),
      200,
    ),
  );
export default baleIntegration;
