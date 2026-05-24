import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { roleDef: true },
  });
  if (!user) return null;
  const roleName = user.roleDef?.name ?? session.user.roleName ?? user.role;
  const initials = user.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <PageHeader title="My profile" description="Your account details." />
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="gradient-primary text-white text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-3 flex-1">
            <div>
              <div className="text-2xl font-bold">{user.name}</div>
              <div className="text-muted-foreground">@{user.username}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{roleName}</Badge>
              <Badge variant={user.active ? "success" : "muted"}>{user.active ? "Active" : "Disabled"}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-sm">
              <Field label="Email" value={user.email} />
              <Field label="Phone" value={user.phone ?? "—"} />
              <Field label="Joined" value={formatDate(user.createdAt)} />
              <Field label="Last login" value={user.lastLoginAt ? formatDate(user.lastLoginAt, true) : "Never"} />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
