import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  HelpCircle,
  Hotel,
  Users,
  Truck,
  Boxes,
  Wallet,
  Zap,
  FileText,
  Settings,
  ShieldCheck,
  Activity,
  CheckSquare,
  CalendarClock,
  Bell,
  BarChart3,
  KeyRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PermissionKey } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Required permission to see this item. Omitted ⇒ visible to all authenticated users. */
  permission?: PermissionKey;
  badge?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "VIEW_DASHBOARD" },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/availability", label: "Availability", icon: CalendarClock },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/bookings", label: "Bookings", icon: ClipboardList },
      { href: "/enquiries", label: "Enquiries", icon: HelpCircle },
      { href: "/quotations", label: "Quotations", icon: FileText },
      { href: "/rooms", label: "Rooms", icon: Hotel },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/vendors", label: "Vendors", icon: Truck },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/payments", label: "Payments", icon: Wallet, permission: "RECORD_PAYMENTS" },
      { href: "/electricity", label: "Electricity", icon: Zap },
      { href: "/reports", label: "Reports", icon: BarChart3, permission: "VIEW_REPORTS" },
    ],
  },
  {
    label: "Inventory",
    items: [{ href: "/inventory", label: "Items", icon: Boxes }],
  },
  {
    label: "Workspace",
    items: [
      { href: "/todos", label: "To-do", icon: CheckSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/audit", label: "Audit log", icon: Activity, permission: "VIEW_AUDIT" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, permission: "MANAGE_SETTINGS" },
      { href: "/staff", label: "Staff", icon: ShieldCheck, permission: "MANAGE_STAFF" },
      { href: "/roles", label: "Roles & permissions", icon: KeyRound, permission: "MANAGE_ROLES" },
    ],
  },
];
