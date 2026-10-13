import { client } from "@kaneo/libs";
import type { InferRequestType, InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

async function read<T>(pending: Promise<Response>): Promise<T> {
  const response = await pending;
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json() as Promise<T>;
}
const api = client.attendance;
export type AttendanceSettings = InferResponseType<
  typeof api.settings.$get,
  200
>;
export type AttendanceProfile = InferResponseType<typeof api.profile.$get, 200>;
export type AttendanceEntry = InferResponseType<
  typeof api.entries.$get,
  200
>["entries"][number];
export type AttendanceRequest = InferResponseType<
  typeof api.requests.$get,
  200
>["requests"][number];
export type AttendanceRequestInput = InferRequestType<
  typeof api.requests.$post
>["json"];
export type AttendanceReportInput = InferRequestType<
  typeof api.report.$get
>["query"];
export type AttendanceReportRow = InferResponseType<
  typeof api.report.$get,
  200
>[number];
export type AttendanceEmployee = InferResponseType<
  typeof api.employees.$get,
  200
>["users"][number];
export type AttendanceBank = InferRequestType<typeof api.bank.$put>["json"];

export const getAttendanceSettings = () =>
  read<AttendanceSettings>(api.settings.$get());
export const putAttendanceSettings = (
  json: InferRequestType<typeof api.settings.$put>["json"],
) => read<AttendanceSettings>(api.settings.$put({ json }));
export const getAttendanceProfile = (userId?: string) =>
  read<AttendanceProfile>(api.profile.$get({ query: { userId } }));
export const getAttendanceProjects = () =>
  read<InferResponseType<typeof api.projects.$get, 200>>(api.projects.$get());
export const getAttendanceEntries = (offset = 0, userId?: string) =>
  read<InferResponseType<typeof api.entries.$get, 200>>(
    api.entries.$get({
      query: { offset: String(offset), limit: "30", userId },
    }),
  );
export const startAttendanceTimer = (
  json: InferRequestType<typeof api.timer.$post>["json"],
) => read<AttendanceEntry>(api.timer.$post({ json }));
export const stopAttendanceTimer = (id: string) =>
  read<AttendanceEntry>(api.entries[":id"].stop.$post({ param: { id } }));
export const getAttendanceRequests = (offset = 0, userId?: string) =>
  read<InferResponseType<typeof api.requests.$get, 200>>(
    api.requests.$get({
      query: { offset: String(offset), limit: "30", userId },
    }),
  );
export const postAttendanceRequest = (json: AttendanceRequestInput) =>
  read<AttendanceRequest>(api.requests.$post({ json }));
export const decideAttendanceRequest = (
  id: string,
  decision: "approved" | "rejected" | "cancelled",
) =>
  read<AttendanceRequest>(
    api.requests[":id"].$put({ param: { id }, json: { decision } }),
  );
export const getAttendanceEmployees = (offset = 0) =>
  read<InferResponseType<typeof api.employees.$get, 200>>(
    api.employees.$get({ query: { offset: String(offset), limit: "30" } }),
  );
export const putAttendanceRole = (
  id: string,
  role: "employee" | "hr" | "finance",
) =>
  read<InferResponseType<(typeof api.employees)[":id"]["role"]["$put"], 200>>(
    api.employees[":id"].role.$put({ param: { id }, json: { role } }),
  );
export const putAttendanceBank = (json: AttendanceBank) =>
  read<AttendanceBank>(api.bank.$put({ json }));
export const getAttendanceReport = (query: AttendanceReportInput) =>
  read<AttendanceReportRow[]>(api.report.$get({ query }));

export const getAttendanceReportProjects = () =>
  read<InferResponseType<typeof api.report.projects.$get, 200>>(
    api.report.projects.$get(),
  );

export const getAttendanceHistory = (offset = 0, userId?: string) =>
  read<InferResponseType<typeof api.history.$get, 200>>(
    api.history.$get({
      query: { offset: String(offset), limit: "30", userId },
    }),
  );

export const getAttendanceTimer = () =>
  read<InferResponseType<typeof api.timer.$get, 200>>(api.timer.$get());
