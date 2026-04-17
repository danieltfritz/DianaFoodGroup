import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "staff";

  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      <main className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
