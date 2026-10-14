import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { auth } from "../../apps/api/src/auth";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { publishEvent } from "../../apps/api/src/events";
import { getChatEventData } from "../../apps/api/src/plugins/chat-event-data";
import { broadcastTaskCreated } from "../../apps/api/src/plugins/registry";
import { initializePlugins } from "../../apps/api/src/plugins";
import { mockAuthenticatedSession, mockAnonymousSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";
import { restrictToProjects } from "./helpers/project-access/restrict-to-projects";

const outbound = vi.hoisted(() => ({
  send: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../apps/api/src/plugins/bale/client", () => ({
  postToBale: outbound.send,
}));
const botToken = `123456789:${"a".repeat(40)}`;
const settings = {
  botToken,
  chatId: " -1234567890123456 ",
  chatLabel: " Team ",
};
const requestBody = (body: unknown) => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("API integration: Bale project delivery", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    outbound.send.mockClear();
  });

  it("supports the complete settings lifecycle without revealing or overwriting a saved token", async () => {
    const owner = await createWorkspaceMember({ role: "owner" });
    const { project } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    mockAuthenticatedSession(owner.user);
    const { app } = createApp();
    const path = `/api/bale-integration/project/${project.id}`;
    expect(await (await app.request(path)).json()).toBeNull();
    const created = await app.request(path, {
      method: "POST",
      ...requestBody(settings),
    });
    expect(created.status).toBe(200);
    const body = await created.json();
    expect(body).toMatchObject({
      chatId: "-1234567890123456",
      chatLabel: "Team",
      botTokenConfigured: true,
      isActive: true,
      events: {
        taskCreated: true,
        taskStatusChanged: true,
        taskCommentCreated: true,
        taskPriorityChanged: false,
        taskTitleChanged: false,
        taskDescriptionChanged: false,
      },
    });
    expect(JSON.stringify(body)).not.toContain(botToken);
    expect(body).not.toHaveProperty("threadId");
    expect(body.createdAt).toEqual(expect.any(String));
    expect(outbound.send).not.toHaveBeenCalled();
    const updated = await app.request(path, {
      method: "PATCH",
      ...requestBody({
        isActive: false,
        chatLabel: null,
        events: { taskCreated: false },
      }),
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({
      isActive: false,
      chatLabel: null,
      events: {
        taskCreated: false,
        taskStatusChanged: true,
        taskCommentCreated: true,
      },
    });
    const stored = await db.query.integrationTable.findFirst({
      where: eq(schema.integrationTable.id, body.id),
    });
    expect(stored && JSON.parse(stored.config).botToken).toBe(botToken);
    const replaced = await app.request(path, {
      method: "POST",
      ...requestBody({ botToken, chatId: "@channel" }),
    });
    // A replacement retains the existing active flag, like Telegram.
    expect(await replaced.json()).toMatchObject({
      id: body.id,
      chatId: "@channel",
      isActive: false,
    });
    expect(
      (
        await app.request(path, {
          method: "PATCH",
          ...requestBody({ isActive: true }),
        })
      ).status,
    ).toBe(200);
    expect(
      await (await app.request(path, { method: "DELETE" })).json(),
    ).toEqual({ success: true });
    expect(await (await app.request(path)).json()).toBeNull();
    expect((await app.request(path, { method: "DELETE" })).status).toBe(404);
    expect(
      (
        await app.request(path, {
          method: "PATCH",
          ...requestBody({ isActive: true }),
        })
      ).status,
    ).toBe(404);
  });

  it("rejects invalid inputs and requires management permission before validating mutations", async () => {
    const viewer = await createWorkspaceMember({ role: "viewer" });
    const { project } = await createProjectFixture({
      workspaceId: viewer.workspace.id,
    });
    const { app } = createApp();
    const path = `/api/bale-integration/project/${project.id}`;
    mockAuthenticatedSession(viewer.user);
    expect((await app.request(path)).status).toBe(200);
    for (const method of ["POST", "PATCH", "DELETE"]) {
      expect(
        (
          await app.request(path, {
            method,
            ...(method === "DELETE"
              ? {}
              : requestBody({ botToken: "secret-invalid", chatId: "" })),
          })
        ).status,
      ).toBe(403);
    }
    await db
      .update(schema.workspaceUserTable)
      .set({ role: "owner" })
      .where(eq(schema.workspaceUserTable.userId, viewer.user.id));
    for (const invalid of [
      { botToken: "invalid", chatId: "123" },
      { botToken, chatId: "a/b" },
      { botToken, chatId: 123 },
    ]) {
      const response = await app.request(path, {
        method: "POST",
        ...requestBody(invalid),
      });
      expect(response.status).toBe(400);
      expect(await response.text()).not.toContain(botToken);
    }
    await app.request(path, { method: "POST", ...requestBody(settings) });
    expect(
      (
        await app.request(path, {
          method: "PATCH",
          ...requestBody({ botToken: "" }),
        })
      ).status,
    ).toBe(400);
    mockAnonymousSession();
    expect((await app.request(path)).status).toBe(401);
  });

  it("enforces workspace and selected-project boundaries", async () => {
    const member = await createWorkspaceMember({ role: "viewer" });
    const { project: allowed } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const { project: hidden } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const outsider = await createWorkspaceMember({ role: "owner" });
    const { project: foreign } = await createProjectFixture({
      workspaceId: outsider.workspace.id,
    });
    await restrictToProjects(member.workspace.id, member.user.id, [allowed.id]);
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    expect(
      (await app.request(`/api/bale-integration/project/${allowed.id}`)).status,
    ).toBe(200);
    for (const projectId of [hidden.id, foreign.id]) {
      for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
        const response = await app.request(
          `/api/bale-integration/project/${projectId}`,
          {
            method,
            ...(["POST", "PATCH"].includes(method)
              ? requestBody(settings)
              : {}),
          },
        );
        expect([403, 404]).toContain(response.status);
        expect(await response.text()).not.toContain(botToken);
      }
    }
  });

  it("retains API-key scopes even for a workspace owner", async () => {
    const owner = await createWorkspaceMember({ role: "owner" });
    const { project } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    mockAnonymousSession();
    const { key } = await auth.api.createApiKey({
      body: {
        userId: owner.user.id,
        name: "Bale test",
        permissions: { project: ["read"] },
      },
    });
    const { app } = createApp();
    const path = `/api/bale-integration/project/${project.id}`;
    const response = await app.request(path, {
      method: "POST",
      body: JSON.stringify(settings),
      headers: { "Content-Type": "application/json", "x-api-key": key },
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "API_KEY_SCOPE" });
  });

  it("follows events through the registered plugin, skips inactive connections and scopes task data", async () => {
    initializePlugins();
    const owner = await createWorkspaceMember({ role: "owner" });
    const { project } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    const { project: other } = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        title: "تسک تست",
        status: "to-do",
        priority: "low",
        number: 1,
      })
      .returning();
    const [integration] = await db
      .insert(schema.integrationTable)
      .values({
        projectId: project.id,
        type: "bale",
        config: JSON.stringify({ botToken, chatId: "123" }),
      })
      .returning();
    expect(await getChatEventData(task.id, other.id, owner.user.id)).toBeNull();
    const event = {
      taskId: task.id,
      projectId: project.id,
      userId: owner.user.id,
      title: task.title,
      description: null,
      priority: "low",
      status: "to-do",
      number: 1,
    };
    await publishEvent("task.created", event, { waitForHandlers: true });
    expect(outbound.send).toHaveBeenCalledWith(botToken, {
      chat_id: "123",
      text: expect.stringContaining("تسک تست"),
    });
    outbound.send.mockClear();
    await db
      .update(schema.integrationTable)
      .set({ isActive: false })
      .where(eq(schema.integrationTable.id, integration.id));
    await broadcastTaskCreated(event);
    expect(outbound.send).not.toHaveBeenCalled();
  });
});
