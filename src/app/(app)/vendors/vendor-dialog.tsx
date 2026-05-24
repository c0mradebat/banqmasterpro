"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createVendor } from "@/server/vendors";
import { toast } from "sonner";

export function VendorDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [v, setV] = useState({ name: "", kind: "CATERER", phone: "", email: "", notes: "" });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add vendor</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2 sm:col-span-2"><Label>Name</Label><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Type</Label>
            <select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {["CATERER","DECORATOR","EVENT_MANAGER","DJ","PHOTOGRAPHER","FLORIST","OTHER"].map(k => <option key={k} value={k}>{k.replace(/_/g," ")}</option>)}
            </select>
          </div>
          <div className="space-y-2"><Label>Phone</Label><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Email</Label><Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="gradient"
            loading={pending}
            onClick={() =>
              start(async () => {
                if (!v.name) {
                  toast.error("Name is required");
                  return;
                }
                await createVendor(v as any);
                toast.success("Vendor added");
                setOpen(false);
                setV({ name: "", kind: "CATERER", phone: "", email: "", notes: "" });
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
