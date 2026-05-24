"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "./nav-config";
import type { PermissionKey } from "@/lib/permissions";

export function AppSidebar({ permissions }: { permissions: PermissionKey[] }) {
  const pathname = usePathname();
  const allow = (p?: PermissionKey) => !p || permissions.includes(p);

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="rounded-lg gradient-primary p-2">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="font-bold">Silver Star</div>
          <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">Pro</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-5">
        {NAV.map((group) => {
          const items = group.items.filter((i) => allow(i.permission));
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-white shadow-sm"
                            : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            active ? "text-white" : "text-sidebar-foreground/60 group-hover:text-white"
                          )}
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{item.badge}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/50">
        v1.0 · Built with care
      </div>
    </aside>
  );
}
