export type HouseholdRole = "owner" | "spouse_partner" | "advisor" | "accountant" | "attorney" | "trustee" | "viewer";

export type HouseholdMembershipStatus = "active" | "invited" | "suspended";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Household = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type HouseholdMembership = {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: HouseholdMembershipStatus;
  created_at: string;
  updated_at: string;
};
