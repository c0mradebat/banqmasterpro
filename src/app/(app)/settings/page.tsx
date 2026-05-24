import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";
import { BlackoutDatesPanel } from "./blackout-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { userCan } from "@/lib/auth-guard";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  if (!(await userCan("MANAGE_SETTINGS"))) redirect("/dashboard");
  const settings = await db.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  const blackouts = await db.blackoutDate.findMany({ orderBy: { date: "asc" } });

  return (
    <>
      <PageHeader title="Settings" description="Default rates, venue info, and blackout dates." />
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="rates">Service rates</TabsTrigger>
          <TabsTrigger value="rooms">Room rates</TabsTrigger>
          <TabsTrigger value="utilities">Utilities</TabsTrigger>
          <TabsTrigger value="blackouts">Blackouts</TabsTrigger>
        </TabsList>
        <SettingsForm settings={JSON.parse(JSON.stringify(settings))} />
        <TabsContent value="blackouts">
          <BlackoutDatesPanel
            initial={blackouts.map((b) => ({
              id: b.id,
              date: b.date.toISOString().slice(0, 10),
              reason: b.reason,
            }))}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
