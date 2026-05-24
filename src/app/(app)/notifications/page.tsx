import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const items = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader title="Notifications" description="Recent alerts and updates." />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {items.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Bell className="h-10 w-10 mx-auto mb-3 opacity-50" />
                You're all caught up.
              </div>
            )}
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.href ?? "#"}
                className={`block p-4 hover:bg-accent transition-colors ${n.read ? "" : "bg-primary/5"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{n.title}</div>
                    {n.body && <div className="text-sm text-muted-foreground mt-1">{n.body}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">{formatDate(n.createdAt, true)}</div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
