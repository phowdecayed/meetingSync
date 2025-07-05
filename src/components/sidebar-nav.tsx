"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Home, Settings, Users, Video, Calendar } from "lucide-react";
import { Button } from "./ui/button";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/meetings", label: "All Meetings", icon: Video },
  { href: "/schedule", label: "My Schedule", icon: Calendar },
  { href: "/users", label: "User Management", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
          <div className="group-data-[collapsed=icon]:hidden">
            <h2 className="font-headline text-2xl font-semibold">MeetingSync</h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href)}
                  tooltip={{ children: item.label, side: "right" }}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsed=icon]:hidden">
        <div className="rounded-lg bg-accent/50 p-4 text-center">
            <h3 className="font-bold">Upgrade to Pro</h3>
            <p className="text-sm text-muted-foreground mt-2">Unlock advanced features and get unlimited meeting scheduling.</p>
            <Button size="sm" className="mt-4 w-full">Upgrade</Button>
        </div>
      </SidebarFooter>
    </>
  );
}
