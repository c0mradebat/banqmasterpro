"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { FormBusyOverlay } from "@/components/form-busy-overlay";
import { saveSettings } from "@/server/settings";
import { toast } from "sonner";
import { Save } from "lucide-react";

export function SettingsForm({ settings: initial }: { settings: any }) {
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();

  function set(k: string, v: any) { setS((cur: any) => ({ ...cur, [k]: v })); }

  function submit() {
    start(async () => {
      try { await saveSettings(s); toast.success("Settings saved"); }
      catch (e: any) { toast.error(e?.message || "Failed"); }
    });
  }

  const fld = (key: string, label: string, type: "text" | "number" = "text") => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={s[key] ?? ""} onChange={(e) => set(key, type === "number" ? Number(e.target.value) : e.target.value)} />
    </div>
  );

  return (
    <div className="relative">
      <FormBusyOverlay show={pending} label="Saving settings…" />
      <TabsContent value="general">
        <Card>
          <CardHeader><CardTitle>Venue</CardTitle><CardDescription>Shown on receipts.</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fld("venueName", "Venue name")}
            {fld("venuePhone", "Phone")}
            {fld("venueEmail", "Email")}
            {fld("gstNumber", "GST number")}
            <div className="sm:col-span-2">{fld("venueAddress", "Address")}</div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rates">
        <Card>
          <CardHeader><CardTitle>Service rates (₹)</CardTitle><CardDescription>Default prices that auto-fill the booking form.</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fld("marriageHallRate", "Marriage Hall", "number")}
            {fld("diningHallRate", "Dining Hall", "number")}
            {fld("shahiBhojRate", "Shahi Bhoj", "number")}
            {fld("lawnRate", "Lawn", "number")}
            {fld("swimmingPoolRate", "Swimming Pool", "number")}
            {fld("poolRefillRate", "Pool Refill", "number")}
            {fld("poolPartyFee", "Pool Party fee", "number")}
            {fld("djHallRate", "DJ Hall", "number")}
            {fld("cocktailRate", "Cocktail Party", "number")}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rooms">
        <Card>
          <CardHeader><CardTitle>Room rates (₹ / night)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fld("nonBalconyRoomRate", "Non-balcony", "number")}
            {fld("balconyRoomRate", "Balcony", "number")}
            {fld("dormitoryRoomRate", "Dormitory", "number")}
            {fld("suiteRoomRate", "Suite", "number")}
            {fld("addonMattressRate", "Add-on mattress", "number")}
            {fld("freeRoomsPerBooking", "Free rooms per booking", "number")}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="utilities">
        <Card>
          <CardHeader><CardTitle>Utility rates</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fld("electricityRatePerUnit", "Electricity (₹/unit)", "number")}
            {fld("generatorRatePerHour", "Generator (₹/hour)", "number")}
            {fld("defaultGstPercent", "Default GST %", "number")}
          </CardContent>
        </Card>
      </TabsContent>

      <div className="flex justify-end mt-6">
        <Button onClick={submit} variant="gradient" size="lg" loading={pending}>
          <Save className="h-4 w-4" />
          Save changes
        </Button>
      </div>
    </div>
  );
}
