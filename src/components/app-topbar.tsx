"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, Moon, Plus, Search, Sun, User as UserIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Badge } from "./ui/badge";

export function AppTopbar({
  user,
}: {
  user: { name: string; username: string; roleName: string; avatarUrl?: string | null };
}) {
  const { theme, setTheme } = useTheme();
  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur px-4 sm:px-6">
      <div className="flex-1 flex items-center gap-3">
        <div className="hidden md:flex relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search bookings, customers, rooms…"
            className="w-full h-9 pl-9 pr-3 rounded-md border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="gradient" size="sm" className="hidden sm:inline-flex">
          <Link href="/bookings/new">
            <Plus className="h-4 w-4" /> New booking
          </Link>
        </Button>

        <Button asChild variant="ghost" size="icon" aria-label="Notifications">
          <Link href="/notifications">
            <Bell className="h-5 w-5" />
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 dark:hidden" />
          <Moon className="hidden dark:block h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="gradient-primary text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {user.roleName}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground font-normal">@{user.username}</div>
              <Badge variant="muted" className="mt-2">{user.roleName}</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile"><UserIcon className="h-4 w-4" /> Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
