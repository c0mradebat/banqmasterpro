import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { SessionProvider } from "@/components/session-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen">
        <AppSidebar permissions={session.user.permissions ?? []} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopbar
            user={{
              name: session.user.name!,
              username: session.user.username,
              roleName: session.user.roleName,
              avatarUrl: session.user.avatarUrl,
            }}
          />
          <main className="flex-1 px-4 sm:px-6 py-6 max-w-screen-2xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
