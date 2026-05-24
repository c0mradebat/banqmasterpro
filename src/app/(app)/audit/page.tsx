import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { userCan } from "@/lib/auth-guard";
import { redirect } from "next/navigation";

export default async function AuditPage() {
  if (!(await userCan("VIEW_AUDIT"))) redirect("/dashboard");
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true },
  });

  return (
    <>
      <PageHeader title="Audit log" description="Every action taken in the system, with timestamps and authors." />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{formatDate(l.createdAt, true)}</TableCell>
                  <TableCell className="text-sm">{l.user?.name ?? "System"}</TableCell>
                  <TableCell><Badge variant="muted">{l.action}</Badge></TableCell>
                  <TableCell className="text-xs">{l.entity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.description}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No audit entries yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
