import { realEmail } from "@kaneo/contacts";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { userTable } from "../../database/schema";

export async function getCurrentUser(userId: string) {
  const [user] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      phoneNumber: userTable.phoneNumber,
      phoneNumberVerified: userTable.phoneNumberVerified,
      image: userTable.image,
      role: userTable.role,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return { ...user, email: realEmail(user.email) };
}

export default getCurrentUser;
