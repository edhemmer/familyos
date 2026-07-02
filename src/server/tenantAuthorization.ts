import type { HouseholdRole } from "../domain/identity";

export type TenantAuthorizationMembership = {
  householdId: string;
  userId: string;
  role: HouseholdRole;
  status: "active" | "invited" | "suspended";
};

export type TenantMembershipReader = {
  getMembership(input: { householdId: string; userId: string }): Promise<TenantAuthorizationMembership | null>;
};

export const integrationManagerRoles: HouseholdRole[] = ["owner", "spouse_partner", "advisor", "accountant"];

export async function assertActiveTenantMember(reader: TenantMembershipReader, householdId: string, userId: string) {
  const membership = await reader.getMembership({ householdId, userId });
  if (!membership || membership.status !== "active") {
    throw new Error("Authenticated user is not an active member of this household.");
  }
  return membership;
}

export async function assertCanManageIntegrations(reader: TenantMembershipReader, householdId: string, userId: string) {
  const membership = await assertActiveTenantMember(reader, householdId, userId);
  if (!integrationManagerRoles.includes(membership.role)) {
    throw new Error("Authenticated user does not have permission to manage integrations for this household.");
  }
  return membership;
}
