import { cookies } from "next/headers";
import { requireSession } from "@/lib/auth";
import { AppSidebar } from "@/components/shell/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ToasterProvider } from "@/components/ui/toaster";
import { UpgradeModalProvider } from "@/components/billing/upgrade-modal";
import { EntitlementsProvider } from "@/components/billing/entitlements-provider";
import { AuthHydrator } from "@/components/shell/auth-hydrator";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  const jar = await cookies();
  const defaultOpen = jar.get("sidebar:state")?.value !== "false";

  return (
    <ToasterProvider>
      <UpgradeModalProvider>
        <EntitlementsProvider>
        <AuthHydrator user={user} />
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar user={user} />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <span className="text-sm text-muted-foreground">CRWLA</span>
            </header>
            <div className="flex-1 container">{children}</div>
          </SidebarInset>
        </SidebarProvider>
        </EntitlementsProvider>
      </UpgradeModalProvider>
    </ToasterProvider>
  );
}
