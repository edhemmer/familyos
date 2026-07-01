import { createClient } from "@supabase/supabase-js";
import type { Household, HouseholdMembership, Profile } from "../domain/identity";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, { id: string; email?: string | null; display_name?: string | null }, { email?: string | null; display_name?: string | null; updated_at?: string }>;
      households: Table<Household, { id?: string; name: string; created_by: string; created_at?: string; updated_at?: string }, { name?: string; updated_at?: string }>;
      household_memberships: Table<
        HouseholdMembership,
        { id?: string; household_id: string; user_id: string; role: HouseholdMembership["role"]; status: HouseholdMembership["status"]; created_at?: string; updated_at?: string },
        { role?: HouseholdMembership["role"]; status?: HouseholdMembership["status"]; updated_at?: string }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_household_with_owner: {
        Args: { household_name: string };
        Returns: Household;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, Json>;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your local .env file.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
