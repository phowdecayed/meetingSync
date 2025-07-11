"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Home, Settings, Users, Video, Calendar, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "./theme-toggle";

const allMenuItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/meetings", label: "All Meetings", icon: Video, roles: ["admin"] },
  {
    href: "/schedule",
    label: "My Schedule",
    icon: Calendar,
    roles: ["member"],
  },
  { href: "/profile", label: "My Profile", icon: User },
  { href: "/users", label: "User Management", icon: Users, roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const menuItems = allMenuItems.filter((item) => {
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  });

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-primary"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
            <circle cx="12" cy="13" r="3"></circle>
          </svg>
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="font-headline text-2xl font-semibold">
              MeetingSync
            </h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="gap-2">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  isActive={
                    item.href === "/profile"
                      ? pathname === item.href
                      : (pathname?.startsWith(item.href) ?? false)
                  }
                  tooltip={{ children: item.label, side: "right" }}
                >
                  <item.icon />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {item.label}
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="items-center">
        <ThemeToggle />
        <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          v0.1.0
        </p>
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            &copy; 2025 Pranata Komputer BPKAD.
          </p>
        </div>
      </SidebarFooter>
    </>
  );
}
