import db, { schema } from "../database";
import { phoneInvitationRoutes } from "./phone-route";
import { eq } from "drizzle-orm";
import { apiRouter, createRoute, jsonResponse } from "../openapi";
import getInvitationDetailsController from "./controllers/get-invitation-details";
import getUserPendingInvitations from "./controllers/get-user-pending-invitations";
import {
  invitationDetailsSchema,
  pendingInvitationListSchema,
} from "./response";
import { invitationParam } from "./schema";

const getPendingRoute = createRoute({
  method: "get",
  operationId: "getUserPendingInvitations",
  path: "/pending",
  tags: ["Invitations"],
  summary: "Get pending invitations",
  description:
    "Get the current user's unexpired, unaccepted invitations. Returns an empty list until the user's email is verified.",
  responses: {
    200: jsonResponse(
      "List of pending invitations",
      pendingInvitationListSchema,
    ),
  },
});

const getInvitationRoute = createRoute({
  method: "get",
  operationId: "getInvitationDetails",
  path: "/{id}",
  tags: ["Invitations"],
  summary: "Get invitation details",
  description:
    "Look up an invitation by ID. Always 200 -- an unusable invitation is reported with valid: false and a reason rather than an error status.",
  request: { params: invitationParam },
  responses: {
    200: jsonResponse("Invitation details", invitationDetailsSchema),
  },
});

const invitation = apiRouter()
  .route("/", phoneInvitationRoutes)
  .openapi(getPendingRoute, async (c) => {
    const user = c.get("user");
    const contact = user
      ? await db.query.userTable.findFirst({
          where: eq(schema.userTable.id, user.id),
        })
      : null;
    if (!contact?.emailVerified && !contact?.phoneNumberVerified) {
      return c.json([], 200);
    }
    return c.json(
      await getUserPendingInvitations(
        contact?.emailVerified ? c.get("userEmail") : "",
        contact?.phoneNumberVerified ? contact.phoneNumber : null,
      ),
      200,
    );
  })
  .openapi(getInvitationRoute, async (c) =>
    c.json(await getInvitationDetailsController(c.req.valid("param").id), 200),
  );

export default invitation;
