import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/lib/utils";
import { Plus } from "lucide-react";
import { InventoryDialog } from "./inventory-dialog";

export default async function InventoryPage() {
  const items = await db.inventoryItem.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Mattresses, towels, chairs, tables — track what you have."
        actions={<InventoryDialog trigger={<Button variant="gradient"><Plus className="h-4 w-4" /> Add item</Button>} />}
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Min stock</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">{i.category ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{i.currentStock}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{i.minStock}</TableCell>
                  <TableCell className="text-right">{formatINR(Number(i.unitCost))}</TableCell>
                  <TableCell>
                    {i.currentStock <= i.minStock ? (
                      <Badge variant="destructive">Low stock</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No inventory yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
