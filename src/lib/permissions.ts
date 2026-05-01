import { Role } from "@/context/AuthContext";

// Centralized permission map. Single source of truth.
export const PERMS = {
  // Pages / routes
  viewDashboard: ["student", "staff", "super_admin"],
  viewLeaderboard: ["student", "staff", "super_admin"],
  viewExams: ["student", "staff", "super_admin"],
  viewTeams: ["student", "staff", "super_admin"],
  viewStudents: ["staff", "super_admin"],
  viewUsers: ["staff", "super_admin"],

  // Actions
  createExam: ["staff", "super_admin"],
  uploadMarks: ["staff", "super_admin"],

  // User management actions
  createStudent: ["staff", "super_admin"],
  createStaff: ["super_admin"],
  createSuperAdmin: ["super_admin"],
  changeUserRole: ["super_admin"],
  deleteAnyUser: ["super_admin"],
  deleteStudent: ["staff", "super_admin"],
} as const satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMS;

export const can = (role: Role | undefined, perm: Permission): boolean =>
  !!role && (PERMS[perm] as readonly Role[]).includes(role);

// Roles a given role is allowed to create
export const creatableRoles = (role: Role | undefined): Role[] => {
  if (role === "super_admin") return ["student", "staff", "super_admin"];
  if (role === "staff") return ["student"];
  return [];
};
