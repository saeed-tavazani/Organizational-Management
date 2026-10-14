import { getUserPendingInvitations as getUserPendingInvitationsUtil } from "../../utils/check-registration-allowed";

export default async function getUserPendingInvitations(
  userEmail: string,
  phoneNumber?: string | null,
) {
  return await getUserPendingInvitationsUtil(userEmail, phoneNumber);
}
