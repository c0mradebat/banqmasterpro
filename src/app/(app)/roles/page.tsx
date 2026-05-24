import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { userCan } from "@/lib/auth-guard";
import { PERMISSION_CATALOG, ALL_PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { Lock, Plus, Users } from "lucide-react";
import { CreateRoleDialog } from "./create-role-dialog";
import { EditRolePanel } from "./edit-role-panel";
import { SeedSystemRolesButton } from "./seed-system-roles-button";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  if (!(await userCan("MANAGE_ROLES"))) redirect("/dashboard");

  const roles = await db.roleDef.findMany({
    orderBy: [{ isSystem: "desc" }, { level: "desc" }, { name: "asc" }],
    include: { _count: { select: { users: true } } },
  });

  // Group permission keys by their UI group for consistent display order.
  const grouped: Record<string, PermissionKey[]> = {};
  for (const key of ALL_PERMISSIONS) {
    const group = PERMISSION_CATALOG[key].group;
    (grouped[group] ??= []).push(key);
  }

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Create custom roles, fine-tune what each role can do. System roles can be edited but not deleted."
        actions={
          <div className="flex gap-2">
            {roles.length === 0 && <SeedSystemRolesButton />}
            <CreateRoleDialog
              groupedPermissions={grouped}
              trigger={
                <Button variant="gradient">
                  <Plus className="h-4 w-4" /> New role
                </Button>
              }
            />
          </div>
        }
      />

      {roles.length === 0 && (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No roles defined yet. Click <strong className="text-foreground">Seed system roles</strong> to populate the seven defaults (Owner, Admin, Manager, etc.) — you can then customize their permissions.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roles.map((r) => (
          <Card key={r.id} className="overflow-hidden">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2">
                  {r.name}
                  {r.isSystem && (
                    <Badge variant="muted" className="gap-1">
                      <Lock className="h-3 w-3" /> System
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {r.description ?? <em className="opacity-70">No description</em>}
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  <span>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{r.key}</code>
                  </span>
                  <span>· Level {r.level}</span>
                  <span className="inline-flex items-center gap-1">
                    · <Users className="h-3 w-3" /> {r._count.users} user{r._count.users === 1 ? "" : "s"}
                  </span>
                  <span>· {r.permissions.length} permission{r.permissions.length === 1 ? "" : "s"}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <EditRolePanel
                role={{
                  id: r.id,
                  name: r.name,
                  description: r.description,
                  level: r.level,
                  isSystem: r.isSystem,
                  permissions: r.permissions as PermissionKey[],
                  userCount: r._count.users,
                }}
                groupedPermissions={grouped}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
