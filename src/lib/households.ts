import { supabase } from "./supabase";
import type { Household, HouseholdMembership } from "../domain/identity";

function formatSupabaseError(context: string, error: { message: string } | null) {
  return new Error(`${context}: ${error?.message ?? "Unknown Supabase error"}`);
}

export async function getCurrentUserHouseholds(): Promise<Household[]> {
  const { data, error } = await supabase.from("households").select("*").order("created_at", { ascending: true });
  if (error) throw formatSupabaseError("Unable to load households", error);
  return data ?? [];
}

export async function getCurrentHousehold(): Promise<Household | null> {
  const households = await getCurrentUserHouseholds();
  return households[0] ?? null;
}

export async function createHousehold(name: string): Promise<Household> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Household name is required.");

  const { data, error } = await supabase.rpc("create_household_with_owner", { household_name: trimmedName });
  if (error) throw formatSupabaseError("Unable to create household", error);
  if (!data) throw new Error("Unable to create household: no household returned.");
  return data;
}

export async function getHouseholdMemberships(householdId: string): Promise<HouseholdMembership[]> {
  if (!householdId) throw new Error("Household id is required.");

  const { data, error } = await supabase
    .from("household_memberships")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (error) throw formatSupabaseError("Unable to load household memberships", error);
  return data ?? [];
}
