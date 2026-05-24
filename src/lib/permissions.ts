/**
 * Permission catalog — the single source of truth for what actions the system gates.
 *
 * Each key here maps to one or more server-action / page guards. Roles (system + custom)
 * are stored in the DB and each carries an array of these keys.
 *
 * Adding a new gate: (1) add a key here with a human label, (2) decide which seed roles
 * should have it (`prisma/seed.ts` → `SYSTEM_ROLES`), (3) gate code with
 * `requirePermission("YOUR_KEY")` or `userCan("YOUR_KEY")`.
 */
export const PERMISSION_CATALOG = {
  // ─── Visibility
  VIEW_DASHBOARD: { label: "View dashboard", group: "View" },
  VIEW_REPORTS: { label: "View reports & analytics", group: "View" },
  VIEW_AUDIT: { label: "View audit log", group: "View" },

  // ─── Bookings
  MANAGE_BOOKINGS: { label: "Create & edit bookings", group: "Bookings" },
  CANCEL_BOOKINGS: { label: "Cancel bookings", group: "Bookings" },
  DELETE_BOOKINGS: { label: "Permanently delete cancelled bookings", group: "Bookings" },

  // ─── Payments
  RECORD_PAYMENTS: { label: "Record advance / partial / final payments", group: "Payments" },
  RECORD_REFUNDS: { label: "Issue refunds & adjustments", group: "Payments" },
  DELETE_PAYMENTS: { label: "Delete payments", group: "Payments" },

  // ─── Enquiries & quotations
  MANAGE_ENQUIRIES: { label: "Create / edit enquiries & status", group: "Enquiries" },
  DELETE_ENQUIRIES: { label: "Delete enquiries", group: "Enquiries" },
  MANAGE_QUOTATIONS: { label: "Create quotations", group: "Enquiries" },
  DELETE_QUOTATIONS: { label: "Delete quotations", group: "Enquiries" },

  // ─── Rooms
  ALLOCATE_ROOMS: { label: "Allocate & release rooms", group: "Rooms" },
  SET_ROOM_STATUS: { label: "Set housekeeping status", group: "Rooms" },
  CREATE_ROOMS: { label: "Add new rooms", group: "Rooms" },

  // ─── Other entities
  MANAGE_VENDORS: { label: "Add / edit vendors", group: "Operations" },
  MANAGE_INVENTORY: { label: "Manage inventory items", group: "Operations" },
  MANAGE_ELECTRICITY: { label: "Record meter readings", group: "Operations" },

  // ─── Admin
  MANAGE_SETTINGS: { label: "Edit venue settings & blackouts", group: "Admin" },
  MANAGE_STAFF: { label: "Add / edit / disable staff", group: "Admin" },
  MANAGE_ROLES: { label: "Create roles & change permissions", group: "Admin" },

  // ─── Special
  DEVELOPER: { label: "Developer tools", group: "Special" },
} as const;

export type PermissionKey = keyof typeof PERMISSION_CATALOG;

export const ALL_PERMISSIONS = Object.keys(PERMISSION_CATALOG) as PermissionKey[];

export function permissionLabel(key: string): string {
  return (PERMISSION_CATALOG as Record<string, { label: string }>)[key]?.label ?? key;
}

export function permissionGroup(key: string): string {
  return (PERMISSION_CATALOG as Record<string, { group: string }>)[key]?.group ?? "Other";
}

/** Default permission sets for the seven seeded system roles. */
export const SYSTEM_ROLE_DEFAULTS: Record<
  "OWNER" | "ADMIN" | "MANAGER" | "ACCOUNTANT" | "RECEPTIONIST" | "STAFF" | "DEV",
  { name: string; description: string; level: number; permissions: PermissionKey[] }
> = {
  DEV: {
    name: "Developer",
    description: "Internal developer access — all permissions including hidden tools.",
    level: 100,
    permissions: ALL_PERMISSIONS,
  },
  OWNER: {
    name: "Owner",
    description: "Venue owner — full operational access.",
    level: 90,
    permissions: ALL_PERMISSIONS.filter((p) => p !== "DEVELOPER"),
  },
  ADMIN: {
    name: "Admin",
    description: "System administrator. Manages staff, settings, and roles.",
    level: 80,
    permissions: ALL_PERMISSIONS.filter((p) => p !== "DEVELOPER"),
  },
  MANAGER: {
    name: "Manager",
    description: "Day-to-day operations. Cancels bookings, issues refunds, manages vendors and inventory.",
    level: 60,
    permissions: [
      "VIEW_DASHBOARD",
      "VIEW_REPORTS",
      "MANAGE_BOOKINGS",
      "CANCEL_BOOKINGS",
      "DELETE_BOOKINGS",
      "RECORD_PAYMENTS",
      "RECORD_REFUNDS",
      "DELETE_PAYMENTS",
      "MANAGE_ENQUIRIES",
      "DELETE_ENQUIRIES",
      "MANAGE_QUOTATIONS",
      "DELETE_QUOTATIONS",
      "ALLOCATE_ROOMS",
      "SET_ROOM_STATUS",
      "MANAGE_VENDORS",
      "MANAGE_INVENTORY",
      "MANAGE_ELECTRICITY",
    ],
  },
  ACCOUNTANT: {
    name: "Accountant",
    description: "Handles payments and refunds; sees reports.",
    level: 40,
    permissions: [
      "VIEW_DASHBOARD",
      "VIEW_REPORTS",
      "RECORD_PAYMENTS",
      "RECORD_REFUNDS",
    ],
  },
  RECEPTIONIST: {
    name: "Receptionist",
    description: "Front-desk operations — creates bookings, records normal payments, allocates rooms.",
    level: 30,
    permissions: [
      "VIEW_DASHBOARD",
      "MANAGE_BOOKINGS",
      "RECORD_PAYMENTS",
      "MANAGE_ENQUIRIES",
      "MANAGE_QUOTATIONS",
      "ALLOCATE_ROOMS",
      "SET_ROOM_STATUS",
      "MANAGE_ELECTRICITY",
    ],
  },
  STAFF: {
    name: "Staff",
    description: "Baseline employee — sees dashboard, updates housekeeping status, records meter readings.",
    level: 20,
    permissions: ["VIEW_DASHBOARD", "SET_ROOM_STATUS", "MANAGE_ELECTRICITY"],
  },
};
