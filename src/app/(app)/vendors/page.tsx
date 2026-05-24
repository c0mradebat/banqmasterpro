import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VendorDialog } from "./vendor-dialog";
import { Phone, Plus, Truck } from "lucide-react";

export default async function VendorsPage() {
  const vendors = await db.vendor.findMany({ orderBy: { name: "asc" } });
  const grouped: Record<string, typeof vendors> = {};
  vendors.forEach((v) => { (grouped[v.kind] = grouped[v.kind] || []).push(v); });

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Caterers, decorators, event managers and more."
        actions={<VendorDialog trigger={<Button variant="gradient"><Plus className="h-4 w-4" /> Add vendor</Button>} />}
      />
      <div className="space-y-6">
        {Object.entries(grouped).map(([kind, list]) => (
          <Card key={kind}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {kind.replace(/_/g, " ")}
                <Badge variant="muted" className="ml-2">{list.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((v) => (
                <div key={v.id} className="rounded-lg border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{v.name}</div>
                      {v.phone && <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1"><Phone className="h-3.5 w-3.5" /> {v.phone}</div>}
                    </div>
                    {!v.active && <Badge variant="muted">Inactive</Badge>}
                  </div>
                  {v.notes && <div className="text-xs text-muted-foreground mt-2 line-clamp-2">{v.notes}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {vendors.length === 0 && <div className="text-center py-12 text-muted-foreground">No vendors yet. Add your first.</div>}
      </div>
    </>
  );
}
