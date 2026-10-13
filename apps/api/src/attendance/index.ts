import { attendanceRoles } from "@kaneo/permissions";
import {
  apiRouter,
  responseTimestamp,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { requireUserSession } from "../utils/require-user-session";
import { attendanceHistory } from "./history";
import { attendanceSettings } from "./access";
import { getAttendanceEntries, getAttendanceTimer } from "./entries";
import {
  attendanceEmployees,
  attendanceProfile,
  saveAttendanceBank,
  saveAttendanceRole,
  saveAttendanceSettings,
} from "./people";
import { reportProjects } from "./report-projects";
import { attendanceProjects } from "./projects";
import { attendanceReport } from "./report";
import {
  decideAttendanceRequest,
  listAttendanceRequests,
  submitAttendanceRequest,
} from "./requests";
import { startTimer, stopTimer } from "./timer";
import {
  bankSchema,
  employeeSchema,
  entrySchema,
  idParam,
  listQuery,
  profileSchema,
  projectSchema,
  reportQuery,
  reportRowSchema,
  requestBody,
  requestSchema,
  settingsBody,
  settingsResponse,
} from "./schema";

const metadata = { tags: ["Attendance"], middleware: [requireUserSession] };
const responses = <T extends z.ZodType>(schema: T) => ({
  200: jsonResponse("Attendance response", schema),
  400: errorResponse("Invalid attendance input"),
  401: errorResponse("User session required"),
  403: errorResponse("Attendance permission required"),
  404: errorResponse("Record not found"),
  409: errorResponse("Attendance state conflict"),
});
const body = <T extends z.ZodType>(schema: T) => ({
  required: true,
  content: { "application/json": { schema } },
});
const historyRoute = createRoute({
  ...metadata,
  method: "get",
  path: "/history",
  operationId: "getAttendanceHistory",
  summary: "Read an authorized audit timeline without financial or bank values",
  request: { query: listQuery },
  responses: responses(
    z.object({
      items: z.array(
        z.object({
          id: z.string(),
          action: z.string(),
          actorName: z.string(),
          resourceId: z.string(),
          createdAt: responseTimestamp,
          startBefore: z.string().nullable(),
          endBefore: z.string().nullable(),
          startAfter: z.string().nullable(),
          endAfter: z.string().nullable(),
        }),
      ),
      total: z.number(),
    }),
  ),
});
const activeTimer = createRoute({
  ...metadata,
  method: "get",
  path: "/timer",
  operationId: "getAttendanceTimer",
  summary: "Read only the current timer for the task sidebar",
  responses: responses(
    z
      .object({
        id: z.string(),
        projectName: z.string(),
        startTime: responseTimestamp,
        needsReview: z.boolean(),
      })
      .nullable(),
  ),
});
const getSettings = createRoute({
  ...metadata,
  method: "get",
  path: "/settings",
  operationId: "getAttendanceSettings",
  summary: "Read shared company settings",
  responses: responses(settingsResponse),
});
const putSettings = createRoute({
  ...metadata,
  method: "put",
  path: "/settings",
  operationId: "updateAttendanceSettings",
  summary: "Schedule company policy and update role grants",
  request: { body: body(settingsBody) },
  responses: responses(settingsResponse),
});
const getProfile = createRoute({
  ...metadata,
  method: "get",
  path: "/profile",
  operationId: "getAttendanceProfile",
  summary: "Read attendance profile with field-level permissions",
  request: { query: z.object({ userId: z.string().optional() }) },
  responses: responses(profileSchema),
});
const projects = createRoute({
  ...metadata,
  method: "get",
  path: "/projects",
  operationId: "getAttendanceProjects",
  summary: "List accessible projects across member workspaces",
  responses: responses(z.array(projectSchema)),
});
const reportProjectRoute = createRoute({
  ...metadata,
  method: "get",
  path: "/report/projects",
  operationId: "getAttendanceReportProjects",
  summary: "List project filters visible in authorized attendance reports",
  responses: responses(z.array(projectSchema)),
});
const entries = createRoute({
  ...metadata,
  method: "get",
  path: "/entries",
  operationId: "getAttendanceEntries",
  summary: "Page through a person's work records",
  request: { query: listQuery },
  responses: responses(
    z.object({
      entries: z.array(entrySchema),
      running: entrySchema.nullable(),
      total: z.number(),
    }),
  ),
});
const start = createRoute({
  ...metadata,
  method: "post",
  path: "/timer",
  operationId: "startAttendanceTimer",
  summary: "Start the user's single company-wide timer",
  request: {
    body: body(
      z.object({
        projectId: z.string().min(1),
        description: z.string().max(2000).default(""),
      }),
    ),
  },
  responses: responses(entrySchema),
});
const stop = createRoute({
  ...metadata,
  method: "post",
  path: "/entries/{id}/stop",
  operationId: "stopAttendanceTimer",
  summary: "Stop an owned timer even after project access is revoked",
  request: { params: idParam },
  responses: responses(entrySchema),
});
const getRequests = createRoute({
  ...metadata,
  method: "get",
  path: "/requests",
  operationId: "getAttendanceRequests",
  summary: "List own and authorized approval requests",
  request: { query: listQuery },
  responses: responses(
    z.object({ requests: z.array(requestSchema), total: z.number() }),
  ),
});
const postRequest = createRoute({
  ...metadata,
  method: "post",
  path: "/requests",
  operationId: "createAttendanceRequest",
  summary: "Request leave, a rate, a time correction or review",
  request: {
    body: body(requestBody.extend({ userId: z.string().optional() })),
  },
  responses: responses(requestSchema),
});
const decide = createRoute({
  ...metadata,
  method: "put",
  path: "/requests/{id}",
  operationId: "decideAttendanceRequest",
  summary: "Decide another person's request or withdraw an own pending request",
  request: {
    params: idParam,
    body: body(
      z.object({ decision: z.enum(["approved", "rejected", "cancelled"]) }),
    ),
  },
  responses: responses(requestSchema),
});
const employees = createRoute({
  ...metadata,
  method: "get",
  path: "/employees",
  operationId: "getAttendanceEmployees",
  summary: "Page through unique company employees",
  request: { query: listQuery },
  responses: responses(
    z.object({ users: z.array(employeeSchema), total: z.number() }),
  ),
});
const role = createRoute({
  ...metadata,
  method: "put",
  path: "/employees/{id}/role",
  operationId: "updateAttendanceRole",
  summary: "Assign an attendance role without granting workspace permissions",
  request: {
    params: idParam,
    body: body(z.object({ role: z.enum(attendanceRoles) })),
  },
  responses: responses(
    z.object({ userId: z.string(), role: z.enum(attendanceRoles) }),
  ),
});
const bank = createRoute({
  ...metadata,
  method: "put",
  path: "/bank",
  operationId: "updateAttendanceBank",
  summary: "Update the current user's bank account",
  request: { body: body(bankSchema) },
  responses: responses(bankSchema),
});
const report = createRoute({
  ...metadata,
  method: "get",
  path: "/report",
  operationId: "getAttendanceReport",
  summary:
    "Aggregate work, leave, lateness and permitted earnings over an explicit period",
  request: { query: reportQuery },
  responses: responses(z.array(reportRowSchema)),
});

const attendance = apiRouter()
  .openapi(activeTimer, async (c) =>
    c.json(await getAttendanceTimer(c.get("userId")), 200),
  )
  .openapi(historyRoute, async (c) => {
    const q = c.req.valid("query");
    return c.json(
      await attendanceHistory(
        c.get("userId"),
        q.userId ?? c.get("userId"),
        q.offset,
        q.limit,
      ),
      200,
    );
  })
  .openapi(reportProjectRoute, async (c) =>
    c.json(await reportProjects(c.get("userId")), 200),
  )
  .openapi(getSettings, async (c) => c.json(await attendanceSettings(), 200))
  .openapi(putSettings, async (c) =>
    c.json(
      await saveAttendanceSettings(c.get("userId"), c.req.valid("json")),
      200,
    ),
  )
  .openapi(getProfile, async (c) =>
    c.json(
      await attendanceProfile(
        c.get("userId"),
        c.req.valid("query").userId ?? c.get("userId"),
      ),
      200,
    ),
  )
  .openapi(projects, async (c) =>
    c.json(await attendanceProjects(c.get("userId")), 200),
  )
  .openapi(entries, async (c) => {
    const q = c.req.valid("query");
    return c.json(
      await getAttendanceEntries(
        c.get("userId"),
        q.userId ?? c.get("userId"),
        q.offset,
        q.limit,
      ),
      200,
    );
  })
  .openapi(start, async (c) => {
    const b = c.req.valid("json");
    return c.json(
      await startTimer(c.get("userId"), b.projectId, b.description),
      200,
    );
  })
  .openapi(stop, async (c) =>
    c.json(await stopTimer(c.get("userId"), c.req.valid("param").id), 200),
  )
  .openapi(getRequests, async (c) => {
    const q = c.req.valid("query");
    return c.json(
      await listAttendanceRequests(
        c.get("userId"),
        q.userId,
        q.offset,
        q.limit,
      ),
      200,
    );
  })
  .openapi(postRequest, async (c) => {
    const b = c.req.valid("json");
    return c.json(
      await submitAttendanceRequest(
        c.get("userId"),
        b.userId ?? c.get("userId"),
        b.payload,
        b.reason,
      ),
      200,
    );
  })
  .openapi(decide, async (c) =>
    c.json(
      await decideAttendanceRequest(
        c.get("userId"),
        c.req.valid("param").id,
        c.req.valid("json").decision,
      ),
      200,
    ),
  )
  .openapi(employees, async (c) => {
    const q = c.req.valid("query");
    return c.json(
      await attendanceEmployees(c.get("userId"), q.offset, q.limit),
      200,
    );
  })
  .openapi(role, async (c) =>
    c.json(
      await saveAttendanceRole(
        c.get("userId"),
        c.req.valid("param").id,
        c.req.valid("json").role,
      ),
      200,
    ),
  )
  .openapi(bank, async (c) =>
    c.json(await saveAttendanceBank(c.get("userId"), c.req.valid("json")), 200),
  )
  .openapi(report, async (c) =>
    c.json(await attendanceReport(c.get("userId"), c.req.valid("query")), 200),
  );

export default attendance;
