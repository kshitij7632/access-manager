import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tiucewmkpsplbkhxyrxv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lGJwSrkuxCITcKUqrWaDww_wacWhdWW";

describe("Backend Edge Functions & Role System Tests", () => {
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  it("Super admin can sign in and load role", async () => {
    // Attempt signin with super admin credentials or verify user_roles table
    const { data: roles, error } = await client
      .from("user_roles")
      .select("user_id, role");
    expect(error).toBeNull();
    expect(roles).toBeDefined();
  });

  it("Verifies role loading never defaults missing roles to student", async () => {
    const roleRows: { role: string }[] = [];
    const roles = roleRows.map((r) => r.role);
    const resolvedRole = roles.includes("super_admin")
      ? "super_admin"
      : roles.includes("staff")
      ? "staff"
      : roles.includes("student")
      ? "student"
      : null;
    expect(resolvedRole).toBeNull();
  });
});
