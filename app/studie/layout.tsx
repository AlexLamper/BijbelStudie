import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import SessionProvider from "../../components/providers/SessionProvider";
import { Header } from "../../components/layout/header";
import { AppSidebar } from "../../components/layout/app-sidebar";
import { SidebarProvider } from "../../components/ui/sidebar";
import { generatePageMetadata } from "../../lib/pageMetadata";

import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";

interface StudyLayoutProps {
  children: React.ReactNode;
}

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('study', lng);
}

export default async function StudyLayout({
  children,
}: StudyLayoutProps) {
  const session = await getServerSession();

  return (
    <div className="antialiased bg-background h-screen flex flex-col overflow-hidden">
      <SessionProvider session={session}>
        <SidebarProvider>
          <AppSidebar />
          <div className="flex flex-col flex-1 min-h-0 w-full">
            <Header />
            {/* overflow-hidden, not overflow-y-auto: the guided flow is a fixed
                frame - step rail on top, Vorige/Volgende at the bottom, one
                scrolling body between them. With a scrollable wrapper the whole
                frame scrolled instead, so a wheel over the footer dragged the
                buttons off screen. */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {children}
            </div>
          </div>
        </SidebarProvider>
      </SessionProvider>
    </div>
  );
}


