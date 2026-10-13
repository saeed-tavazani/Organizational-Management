import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { defaultAttendancePolicy } from "../../apps/api/src/attendance/time";
import { defaultAttendanceGrants } from "../../packages/permissions/src/attendance";
import { mockAuthenticatedSession, mockAnonymousSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

const policy = {
  ...defaultAttendancePolicy,
  enabled: true,
  weekStartsOn: 6 as const,
};
type Fixture = Awaited<ReturnType<typeof createWorkspaceMember>>;
async function request(
  user: Fixture["user"],
  path: string,
  method = "GET",
  body?: unknown,
) {
  mockAuthenticatedSession(user);
  return createApp().app.request(`/api/attendance${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function staff(role: "hr" | "finance" | "admin") {
  const fixture = await createWorkspaceMember();
  if (role === "admin")
    await db
      .update(schema.userTable)
      .set({ role: "admin" })
      .where(eq(schema.userTable.id, fixture.user.id));
  else
    await db
      .insert(schema.attendanceEmployeeTable)
      .values({ userId: fixture.user.id, role });
  return fixture;
}
async function entryFor(
  person: Fixture,
  startTime = "2026-10-12T08:50:00+03:30",
  endTime: string | null = "2026-10-12T09:50:00+03:30",
  hourlyRate: number | null = 100000,
) {
  const { project } = await createProjectFixture({
    workspaceId: person.workspace.id,
  });
  const [entry] = await db
    .insert(schema.attendanceEntryTable)
    .values({
      userId: person.user.id,
      projectId: project.id,
      projectName: project.name,
      workspaceId: person.workspace.id,
      workspaceName: person.workspace.name,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      hourlyRate,
      policy,
    })
    .returning();
  return entry;
}
const reportRange = "/report?from=2026-10-11T20:30:00Z&to=2026-10-12T20:30:00Z";

describe("attendance company boundaries", () => {
  beforeEach(resetTestDatabase);
  it("lists only accessible member projects across workspaces and prevents a second timer", async () => {
    const person = await createWorkspaceMember();
    const second = await createWorkspaceMember();
    await db.insert(schema.workspaceUserTable).values({
      userId: person.user.id,
      workspaceId: second.workspace.id,
      role: "member",
      joinedAt: new Date(),
    });
    const a = await createProjectFixture({ workspaceId: person.workspace.id });
    const b = await createProjectFixture({ workspaceId: second.workspace.id });
    const outsider = await createWorkspaceMember();
    const hidden = await createProjectFixture({
      workspaceId: outsider.workspace.id,
    });
    const projects = await (await request(person.user, "/projects")).json();
    expect(projects.map((p: { id: string }) => p.id).sort()).toEqual(
      [a.project.id, b.project.id].sort(),
    );
    expect(
      (
        await request(person.user, "/timer", "POST", {
          projectId: hidden.project.id,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(person.user, "/timer", "POST", {
          projectId: a.project.id,
        })
      ).status,
    ).toBe(200);
    const timer = await (await request(person.user, "/timer")).json();
    expect(timer).toMatchObject({
      projectName: a.project.name,
      needsReview: false,
    });
    expect(timer.id).toBeTruthy();
    expect(timer.startTime).toBeTruthy();
    expect(
      (
        await request(person.user, "/timer", "POST", {
          projectId: b.project.id,
        })
      ).status,
    ).toBe(409);
  });
  it("allows stopping an owned timer after losing project membership", async () => {
    const person = await createWorkspaceMember();
    const { project } = await createProjectFixture({
      workspaceId: person.workspace.id,
    });
    const started = await (
      await request(person.user, "/timer", "POST", { projectId: project.id })
    ).json();
    await db
      .delete(schema.workspaceUserTable)
      .where(eq(schema.workspaceUserTable.userId, person.user.id));
    expect(
      (await request(person.user, `/entries/${started.id}/stop`, "POST"))
        .status,
    ).toBe(200);
    expect(
      (await request(person.user, `/entries/${started.id}/stop`, "POST"))
        .status,
    ).toBe(200);
    expect(
      (await request(person.user, "/timer", "POST", { projectId: project.id }))
        .status,
    ).toBe(403);
  });
  it("prevents even the main administrator from approving their own leave", async () => {
    const admin = await staff("admin");
    const hr = await staff("hr");
    const created = await (
      await request(admin.user, "/requests", "POST", {
        payload: {
          kind: "leave",
          mode: "hourly",
          startTime: "2026-11-01T08:30:00+03:30",
          endTime: "2026-11-01T10:00:00+03:30",
        },
        reason: "Test leave",
      })
    ).json();
    expect(
      (
        await request(admin.user, `/requests/${created.id}`, "PUT", {
          decision: "approved",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(hr.user, `/requests/${created.id}`, "PUT", {
          decision: "approved",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(hr.user, `/requests/${created.id}`, "PUT", {
          decision: "approved",
        })
      ).status,
    ).toBe(409);
  });
  it("keeps earnings and bank values out of HR reports and responses", async () => {
    const person = await createWorkspaceMember();
    const hr = await staff("hr");
    const finance = await staff("finance");
    await entryFor(person);
    await db.insert(schema.attendanceBankTable).values({
      userId: person.user.id,
      holder: "Synthetic employee",
      iban: "IR00000000000000000000000000",
    });
    const hrRows = await (
      await request(hr.user, `${reportRange}&userId=${person.user.id}`)
    ).json();
    expect(hrRows[0]).toMatchObject({
      seconds: 3600,
      gross: null,
      penalty: null,
      net: null,
    });
    const hrProfile = await (
      await request(hr.user, `/profile?userId=${person.user.id}`)
    ).json();
    expect(hrProfile.bank).toBeNull();
    const financial = await (
      await request(finance.user, `${reportRange}&userId=${person.user.id}`)
    ).json();
    expect(financial[0]).toMatchObject({
      gross: 100000,
      lateMinutes: 5,
      penalty: 10000,
      net: 90000,
    });
    expect(
      (await request(person.user, `${reportRange}&userId=${hr.user.id}`))
        .status,
    ).toBe(403);
  });
  it("excludes over-limit running work until stopped and reviewed by somebody else", async () => {
    const person = await createWorkspaceMember();
    const hr = await staff("hr");
    const row = await entryFor(person, "2026-10-12T00:00:00Z", null);
    const report = await (await request(person.user, reportRange)).json();
    expect(report[0].gross).toBe(0);
    expect(report[0].pendingSeconds).toBeGreaterThan(0);
    expect(
      (
        await request(person.user, "/requests", "POST", {
          payload: { kind: "review", entryId: row.id },
          reason: "Forgot timer",
        })
      ).status,
    ).toBe(409);
    await request(person.user, `/entries/${row.id}/stop`, "POST");
    const review = await (
      await request(person.user, "/requests", "POST", {
        payload: { kind: "review", entryId: row.id },
        reason: "Reviewed working period",
      })
    ).json();
    expect(
      (
        await request(hr.user, `/requests/${review.id}`, "PUT", {
          decision: "approved",
        })
      ).status,
    ).toBe(200);
    const approved = await (await request(person.user, reportRange)).json();
    expect(approved[0].gross).toBeGreaterThan(0);
    expect(approved[0].pendingSeconds).toBe(0);
  });
  it("keeps original work unchanged until a non-overlapping correction is approved", async () => {
    const person = await createWorkspaceMember();
    const hr = await staff("hr");
    const row = await entryFor(person);
    const created = await (
      await request(person.user, "/requests", "POST", {
        payload: {
          kind: "correction",
          entryId: row.id,
          projectId: row.projectId,
          startTime: "2026-10-12T08:30:00+03:30",
          endTime: "2026-10-12T09:50:00+03:30",
          description: "Corrected",
          remove: false,
        },
        reason: "Started on time",
      })
    ).json();
    const [unchanged] = await db
      .select()
      .from(schema.attendanceEntryTable)
      .where(eq(schema.attendanceEntryTable.id, row.id));
    expect(+unchanged.startTime).toBe(+row.startTime);
    expect(
      (
        await request(hr.user, `/requests/${created.id}`, "PUT", {
          decision: "approved",
        })
      ).status,
    ).toBe(200);
    const result = await (await request(person.user, reportRange)).json();
    expect(result[0].lateMinutes).toBe(0);
    const history = await (
      await request(hr.user, `/history?userId=${person.user.id}`)
    ).json();
    expect(
      history.items.some(
        (a: { startBefore: string }) =>
          a.startBefore === row.startTime.toISOString(),
      ),
    ).toBe(true);
    expect(JSON.stringify(history)).not.toContain("hourlyRate");
  });
  it("requires approval before a proposed hourly rate becomes effective", async () => {
    const person = await createWorkspaceMember();
    const finance = await staff("finance");
    const proposal = await (
      await request(person.user, "/requests", "POST", {
        payload: { kind: "rate", amount: 100000 },
        reason: "Agreed hourly rate",
      })
    ).json();
    expect(
      (await (await request(person.user, "/profile")).json()).rate,
    ).toBeNull();
    expect(
      (
        await request(finance.user, `/requests/${proposal.id}`, "PUT", {
          decision: "approved",
        })
      ).status,
    ).toBe(200);
    expect((await (await request(person.user, "/profile")).json()).rate).toBe(
      100000,
    );
    const hr = await staff("hr");
    const rates = await (await request(hr.user, "/requests")).json();
    expect(rates.requests).toEqual([]);
  });
  it("rejects leave overlapping recorded work and retains history after a project is removed", async () => {
    const person = await createWorkspaceMember();
    const hr = await staff("hr");
    const row = await entryFor(person);
    const leave = await (
      await request(person.user, "/requests", "POST", {
        payload: {
          kind: "leave",
          mode: "hourly",
          startTime: "2026-10-12T09:00:00+03:30",
          endTime: "2026-10-12T10:00:00+03:30",
        },
        reason: "Conflicting leave",
      })
    ).json();
    expect(
      (
        await request(hr.user, `/requests/${leave.id}`, "PUT", {
          decision: "approved",
        })
      ).status,
    ).toBe(409);
    await db
      .delete(schema.projectTable)
      .where(eq(schema.projectTable.id, row.projectId));
    const rows = await (await request(person.user, "/entries")).json();
    expect(rows.entries[0].projectName).toBe(row.projectName);
  });
  it("schedules new rules without repricing or changing old work", async () => {
    const admin = await staff("admin");
    const person = await createWorkspaceMember();
    await entryFor(person);
    expect(
      (
        await request(admin.user, "/settings", "PUT", {
          policy,
          grants: defaultAttendanceGrants,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(admin.user, "/settings", "PUT", {
          policy: { ...policy, penaltyPerMinute: 999 },
          grants: defaultAttendanceGrants,
        })
      ).status,
    ).toBe(200);
    const rows = await (await request(person.user, reportRange)).json();
    expect(rows[0].penalty).toBe(10000);
    expect(
      (
        await request(person.user, "/settings", "PUT", {
          policy,
          grants: defaultAttendanceGrants,
        })
      ).status,
    ).toBe(403);
  });
  it("serializes simultaneous starts across projects", async () => {
    const person = await createWorkspaceMember();
    const a = await createProjectFixture({ workspaceId: person.workspace.id });
    const b = await createProjectFixture({ workspaceId: person.workspace.id });
    const results = await Promise.all([
      request(person.user, "/timer", "POST", { projectId: a.project.id }),
      request(person.user, "/timer", "POST", { projectId: b.project.id }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });
  it("combines morning leave with a fresh grace period and keeps holiday work paid", async () => {
    const person = await createWorkspaceMember();
    const hr = await staff("hr");
    const leave = await (
      await request(person.user, "/requests", "POST", {
        payload: {
          kind: "leave",
          mode: "hourly",
          startTime: "2026-10-12T08:30:00+03:30",
          endTime: "2026-10-12T10:00:00+03:30",
        },
        reason: "Morning appointment",
      })
    ).json();
    expect(
      (
        await request(hr.user, `/requests/${leave.id}`, "PUT", {
          decision: "approved",
        })
      ).status,
    ).toBe(200);
    await entryFor(
      person,
      "2026-10-12T10:20:00+03:30",
      "2026-10-12T11:20:00+03:30",
    );
    const rows = await (await request(person.user, reportRange)).json();
    expect(rows[0]).toMatchObject({
      leaveSeconds: 5400,
      lateMinutes: 5,
      penalty: 10000,
      gross: 100000,
    });
    await entryFor(
      person,
      "2026-10-16T12:00:00+03:30",
      "2026-10-16T13:00:00+03:30",
    );
    const holiday = await (
      await request(
        person.user,
        "/report?from=2026-10-15T20:30:00Z&to=2026-10-16T20:30:00Z",
      )
    ).json();
    expect(holiday[0]).toMatchObject({
      seconds: 3600,
      gross: 100000,
      penalty: 0,
    });
  });
  it("cancels approved leave only through a second approval", async () => {
    const person = await createWorkspaceMember();
    const hr = await staff("hr");
    const leave = await (
      await request(person.user, "/requests", "POST", {
        payload: {
          kind: "leave",
          mode: "daily",
          startTime: "2026-10-12T00:00:00+03:30",
          endTime: "2026-10-13T00:00:00+03:30",
        },
        reason: "One day leave",
      })
    ).json();
    await request(hr.user, `/requests/${leave.id}`, "PUT", {
      decision: "approved",
    });
    expect(
      (await (await request(person.user, reportRange)).json())[0].leaveDays,
    ).toBe(1);
    const cancel = await (
      await request(person.user, "/requests", "POST", {
        payload: { kind: "cancel", requestId: leave.id },
        reason: "Leave no longer needed",
      })
    ).json();
    expect(
      (await (await request(person.user, reportRange)).json())[0].leaveDays,
    ).toBe(1);
    await request(hr.user, `/requests/${cancel.id}`, "PUT", {
      decision: "approved",
    });
    expect(
      (await (await request(person.user, reportRange)).json())[0].leaveDays,
    ).toBe(0);
  });
  it("keeps unknown-rate earnings unknown and reports clipped overnight work", async () => {
    const person = await createWorkspaceMember();
    await entryFor(
      person,
      "2026-10-11T23:30:00+03:30",
      "2026-10-12T01:30:00+03:30",
      null,
    );
    const rows = await (await request(person.user, reportRange)).json();
    expect(rows[0]).toMatchObject({
      seconds: 5400,
      unknownRateSeconds: 5400,
      gross: null,
      net: null,
      lateMinutes: 0,
    });
  });
  it("validates bank checksums and never copies bank numbers into audit history", async () => {
    const person = await createWorkspaceMember();
    const finance = await staff("finance");
    const body = "0".repeat(22);
    let mod = 0;
    for (const digit of `${body}182700`) mod = (mod * 10 + Number(digit)) % 97;
    const iban = `IR${String(98 - mod).padStart(2, "0")}${body}`;
    expect(
      (
        await request(person.user, "/bank", "PUT", {
          holder: "Synthetic account",
          iban: "IR00" + body,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(person.user, "/bank", "PUT", {
          holder: "Synthetic account",
          iban,
        })
      ).status,
    ).toBe(200);
    const profile = await (
      await request(finance.user, `/profile?userId=${person.user.id}`)
    ).json();
    expect(profile.bank.iban).toBe(iban);
    const history = await (
      await request(finance.user, `/history?userId=${person.user.id}`)
    ).json();
    expect(JSON.stringify(history)).not.toContain(iban);
  });

  it("rejects API keys even for the main administrator", async () => {
    const admin = await staff("admin");
    mockAnonymousSession();
    const key = `test_${randomUUID()}`;
    await db.insert(schema.apikeyTable).values({
      referenceId: admin.user.id,
      userId: admin.user.id,
      key: createHash("sha256").update(key).digest("base64url"),
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await createApp().app.request("/api/attendance/profile", {
      headers: { "x-api-key": key },
    });
    expect(result.status).toBe(403);
  });
});
