"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  School,
  UtensilsCrossed,
  ClipboardList,
  Factory,
  Truck,
  Receipt,
  BarChart3,
  Settings,
  Home,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/layout/user-menu";

const navItems = [
  { title: "Dashboard", href: "/", icon: Home },
  { title: "Kid Counts", href: "/kid-counts", icon: ClipboardList },
  { title: "Production", href: "/production", icon: Factory },
  { title: "Delivery", href: "/delivery", icon: Truck },
  { title: "Billing", href: "/billing", icon: Receipt },
  { title: "Reports", href: "/reports", icon: BarChart3 },
];

const adminItems = [
  { title: "Schools", href: "/schools", icon: School },
  { title: "Menus", href: "/menus", icon: UtensilsCrossed },
  { title: "Admin", href: "/admin", icon: Settings },
];

export function AppSidebar({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex flex-col">
          <span className="text-lg font-bold text-foreground">CCFP</span>
          <span className="text-xs text-muted-foreground">Diana Food Group</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton render={<Link href={item.href} />} isActive={pathname === item.href}>
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />} isActive={pathname === item.href}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
