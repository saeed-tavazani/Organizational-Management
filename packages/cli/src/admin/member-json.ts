import type { OrganizationMember } from "../api/members.js";
import { isoTimestamp } from "./iso-timestamp.js";
import { roleRank } from "./roles.js";

export type MemberJson = {
  readonly id: string;
  readonly memberId: string;
  readonly name: string;
  readonly email: string | null;
  readonly phoneNumber?: string | null;
  readonly role: string;
  readonly joinedAt: string | null;
};

export function toMemberJson(member: OrganizationMember): MemberJson {
  return {
    id: member.userId,
    memberId: member.id,
    name: member.user.name,
    email: member.user.email,
    phoneNumber: member.user.phoneNumber,
    role: member.role,
    joinedAt: isoTimestamp(member.createdAt),
  };
}

export function sortMembers(
  members: ReadonlyArray<MemberJson>,
): Array<MemberJson> {
  return [...members].sort(
    (a, b) =>
      roleRank(a.role) - roleRank(b.role) ||
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()) ||
      (a.email ?? a.phoneNumber ?? "").localeCompare(
        b.email ?? b.phoneNumber ?? "",
      ),
  );
}
