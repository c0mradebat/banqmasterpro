"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInventoryItem } from "@/server/inventory";
import { toast } from "sonner";

export function InventoryDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [item, setItem] = useState({ name: "", category: "", unitCost: 0, currentStock: 0, minStock: 0 });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add inventory item</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2 col-span-2"><Label>Name</Label><Input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} /></div>
          <div className="space-y-2 col-span-2"><Label>Category</Label><Input value={item.category} onChange={(e) => setItem({ ...item, category: e.target.value })} placeholder="bedding, linen, furniture…" /></div>
          <div className="space-y-2"><Label>Unit cost (₹)</Label><Input type="number" min={0} value={item.unitCost} onChange={(e) => setItem({ ...item, unitCost: Number(e.target.value) })} /></div>
          <div className="space-y-2"><Label>Current stock</Label><Input type="number" min={0} value={item.currentStock} onChange={(e) => setItem({ ...item, currentStock: Number(e.target.value) })} /></div>
          <div className="space-y-2"><Label>Min stock alert</Label><Input type="number" min={0} value={item.minStock} onChange={(e) => setItem({ ...item, minStock: Number(e.target.value) })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="gradient"
            loading={pending}
            onClick={() =>
              start(async () => {
                if (!item.name) {
                  toast.error("Name required");
                  return;
                }
                await createInventoryItem(item);
                toast.success("Item added");
                setOpen(false);
                setItem({ name: "", category: "", unitCost: 0, currentStock: 0, minStock: 0 });
              })
            }
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
