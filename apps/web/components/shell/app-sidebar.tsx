"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Shield,
  Tag,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";
import Link from "next/link";
import { useStartCrawl } from "@/components/start-crawl-modal";
import { useSignout } from "@/lib/queries/auth";

type NavItem = {
  href: __next_route_internal_types__.RouteImpl<string>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
};

const NAV_PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Crawls", icon: LayoutDashboard },
  { href: "/search", label: "Recent results", icon: Search },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

const NAV_ADMIN: NavItem[] = [
  { href: "/admin", label: "Access requests", icon: Shield },
  { href: "/admin/users", label: "Members", icon: Users },
  { href: "/admin/billing", label: "Plans & Pricing", icon: Tag },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { open: openStartCrawl } = useStartCrawl();
  const signoutMut = useSignout();
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  function signOut() {
    signoutMut.mutate(undefined, {
      onSettled: () => {
        router.push("/signin");
        router.refresh();
      },
    });
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="px-3 pt-4 pb-3">
        <div className="flex items-center gap-2.5 px-1">
          <div
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-md bg-fg font-mono text-[13px] font-semibold text-bg-elev",
            )}
          >
            CR
          </div>
          <span className="text-[15px] font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            CRWLA
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 pb-1.5 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={openStartCrawl}
                  tooltip="Start a crawl"
                  className="h-7 gap-2.5 px-2 text-[13px] text-fg-muted hover:bg-bg-sunk hover:text-fg"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Start a crawl</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {NAV_PRIMARY.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    className="h-7 gap-2.5 px-2 text-[13px] text-fg-muted data-[active=true]:bg-bg-sunk data-[active=true]:font-medium data-[active=true]:text-fg hover:bg-bg-sunk hover:text-fg"
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                    {typeof item.count === "number" && (
                      <span className="ml-auto font-mono text-[10px] text-fg-subtle">
                        {item.count}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user.role === "ADMIN" && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 pb-1.5 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ADMIN.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive(item.href)}
                      tooltip={item.label}
                      className="h-7 gap-2.5 px-2 text-[13px] text-fg-muted data-[active=true]:bg-bg-sunk data-[active=true]:font-medium data-[active=true]:text-fg hover:bg-bg-sunk hover:text-fg"
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:hidden">
          <Link
            href="/profile"
            className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-border bg-bg-sunk text-[11px] font-medium text-fg-muted hover:bg-bg hover:text-fg"
            aria-label="Profile"
          >
            {initials(user.name)}
          </Link>
          <Link href="/profile" className="min-w-0 flex-1 hover:opacity-80">
            <div className="truncate text-[12px] font-medium text-fg">
              {user.name}
            </div>
            <div className="truncate font-mono text-[10px] text-fg-muted">
              {user.role.toLowerCase()}
            </div>
          </Link>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-bg-elev text-fg hover:bg-bg-sunk"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
