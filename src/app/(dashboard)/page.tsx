import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome, {session?.user?.name ?? "there"}</h1>
      <p className="mt-2 text-muted-foreground">
        Select an option from the sidebar to get started.
      </p>
    </div>
  );
}
