import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { and, eq } from "drizzle-orm";
import { createApp } from "../../apps/api/src/index";
import { auth } from "../../apps/api/src/auth";
import db, { schema } from "../../apps/api/src/database";
import { decryptBalePayload } from "../../apps/api/src/bale/crypto";
import { resetTestDatabase } from "./helpers/database";
import { createProjectFixture } from "./helpers/fixtures";

const headers = {
  "Content-Type": "application/json",
  Origin: "http://localhost:5173",
};
async function post(path: string, body: unknown, cookie?: string) {
  return createApp().app.request(`/api${path}`, {
    method: "POST",
    headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((part) => part.split(";")[0])
    .join("; ");
}
async function owner() {
  const response = await post("/auth/sign-up/email", {
    name: "Owner",
    email: "owner@example.com",
    password: "safe-test-password-1234",
  });
  expect(response.status).toBe(200);
  const cookie = cookies(response);
  const workspace = await auth.api.createOrganization({
    headers: new Headers({ ...headers, Cookie: cookie }),
    body: { name: "Phone invites", slug: "phone-invites" },
  });
  return { cookie, workspace: workspace! };
}
async function phoneUser(phoneNumber = "+989123456789") {
  expect(
    (await post("/auth/phone-number/send-otp", { phoneNumber })).status,
  ).toBe(200);
  const delivery = await db.query.baleDeliveryTable.findFirst({
    where: and(
      eq(schema.baleDeliveryTable.phoneNumber, phoneNumber),
      eq(schema.baleDeliveryTable.kind, "otp"),
    ),
  });
  const code = decryptBalePayload<{ message: { otp: string } }>(
    delivery!.payload,
  ).message.otp;
  const response = await post("/auth/phone-number/verify", {
    phoneNumber,
    code,
    name: "Invited User",
  });
  expect(response.status).toBe(200);
  return { cookie: cookies(response), user: (await response.json()).user };
}
describe("phone workspace invitations", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    vi.stubEnv("BALE_SAFIR_API_ACCESS_KEY", "test-key");
    vi.stubEnv("BALE_SAFIR_BOT_ID", "123");
    process.env.DISABLE_REGISTRATION = "false";
  });
  afterEach(() => vi.unstubAllEnvs());
  it("sends to an unregistered number and accepts once with selected-project access", async () => {
    const actor = await owner();
    const project = await createProjectFixture({
      workspaceId: actor.workspace.id,
    });
    const created = await post(
      "/invitation/phone",
      {
        workspaceId: actor.workspace.id,
        phoneNumber: "۰۹۱۲۳۴۵۶۷۸۹",
        role: "member",
        projectAccess: "selected",
        projectIds: [project.project.id],
      },
      actor.cookie,
    );
    expect(created.status).toBe(200);
    const invite = await created.json();
    expect(invite).toMatchObject({ email: null, phoneNumber: "+989123456789" });
    expect(
      await db.query.baleDeliveryTable.findMany({
        where: eq(schema.baleDeliveryTable.kind, "invitation"),
      }),
    ).toHaveLength(1);
    const recipient = await phoneUser();
    const pending = await createApp().app.request("/api/invitation/pending", {
      headers: { Cookie: recipient.cookie },
    });
    expect(
      (await pending.json()).map((row: { id: string }) => row.id),
    ).toContain(invite.id);
    const answered = await Promise.all(
      [1, 2].map(() =>
        post(
          "/auth/organization/accept-invitation",
          { invitationId: invite.id },
          recipient.cookie,
        ),
      ),
    );
    expect(answered.map((response) => response.status).sort()).toEqual([
      200, 400,
    ]);
    expect(
      await db.query.workspaceUserTable.findMany({
        where: and(
          eq(schema.workspaceUserTable.workspaceId, actor.workspace.id),
          eq(schema.workspaceUserTable.userId, recipient.user.id),
        ),
      }),
    ).toHaveLength(1);
    const access = await db.query.workspaceMemberAccessTable.findFirst({
      where: eq(schema.workspaceMemberAccessTable.userId, recipient.user.id),
    });
    expect(access?.projectAccess).toBe("selected");
  });
  it("refuses a user with another verified phone even when they know the link", async () => {
    const actor = await owner();
    const created = await post(
      "/invitation/phone",
      {
        workspaceId: actor.workspace.id,
        phoneNumber: "09123456789",
        role: "member",
      },
      actor.cookie,
    );
    const invite = await created.json();
    const stranger = await phoneUser("+989123456780");
    expect(
      (
        await post(
          "/auth/organization/accept-invitation",
          { invitationId: invite.id },
          stranger.cookie,
        )
      ).status,
    ).toBe(403);
  });
  it("allows rejection, cancellation and resend through the existing organization paths", async () => {
    const actor = await owner();
    const created = await post(
      "/invitation/phone",
      {
        workspaceId: actor.workspace.id,
        phoneNumber: "09123456789",
        role: "member",
      },
      actor.cookie,
    );
    const invite = await created.json();
    const resend = await post(
      "/invitation/phone",
      {
        workspaceId: actor.workspace.id,
        phoneNumber: "09123456789",
        role: "member",
        resend: true,
      },
      actor.cookie,
    );
    expect(resend.status).toBe(200);
    expect((await resend.json()).id).toBe(invite.id);
    const recipient = await phoneUser();
    expect(
      (
        await post(
          "/auth/organization/reject-invitation",
          { invitationId: invite.id },
          recipient.cookie,
        )
      ).status,
    ).toBe(200);
    expect((await db.query.invitationTable.findFirst())?.status).toBe(
      "rejected",
    );
    const another = await post(
      "/invitation/phone",
      {
        workspaceId: actor.workspace.id,
        phoneNumber: "09123456780",
        role: "member",
      },
      actor.cookie,
    );
    expect(
      (
        await post(
          "/auth/organization/cancel-invitation",
          { invitationId: (await another.json()).id },
          actor.cookie,
        )
      ).status,
    ).toBe(200);
  });
});
