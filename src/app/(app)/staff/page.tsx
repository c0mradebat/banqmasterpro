import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { StaffDialog } from "./staff-dialog";
import { Plus } from "lucide-react";
import { userCan } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { SYSTEM_ROLE_DEFAULTS } from "@/lib/permissions";
import { RoleCell } from "./role-cell";

export default async function StaffPage() {
  if (!(await userCan("MANAGE_STAFF"))) redirect("/dashboard");
  const [users, roles] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { roleDef: { select: { id: true, name: true } } },
    }),
    db.roleDef.findMany({
      orderBy: [{ level: "desc" }, { name: "asc" }],
      select: { id: true, key: true, name: true },
    }),
  ]);
  return (
    <>
      <PageHeader
        title="Staff"
        description="Add team members and assign roles."
        actions={<StaffDialog roles={roles} trigger={<Button variant="gradient"><Plus className="h-4 w-4" /> Add user</Button>} />}
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="gradient-primary text-white text-xs">
                          {u.name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">@{u.username}</TableCell>
                  <TableCell>
                    <RoleCell
                      userId={u.id}
                      currentRoleId={u.roleDef?.id ?? null}
                      currentRoleName={u.roleDef?.name ?? SYSTEM_ROLE_DEFAULTS[u.role]?.name ?? u.role}
                      roles={roles.map((r) => ({ id: r.id, name: r.name }))}
                    />
                  </TableCell>
                  <TableCell><Badge variant={u.active ? "success" : "muted"}>{u.active ? "Active" : "Disabled"}</Badge></TableCell>
                  <TableCell className="text-xs">{u.lastLoginAt ? formatDate(u.lastLoginAt, true) : "Never"}</TableCell>
                  <TableCell className="text-xs">{formatDate(u.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
