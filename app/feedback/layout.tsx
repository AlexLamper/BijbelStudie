import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import SessionProvider from "../../components/providers/SessionProvider";
import { Header } from "../../components/layout/header";
import { AppSidebar } from "../../components/layout/app-sidebar";
import { SidebarProvider } from "../../components/ui/sidebar";

export const metadata: Metadata = {
  title: "Feedback | BijbelStudie",
  description:
    "Deel je feedback om BijbelStudie nog beter te maken. Meld bugs, vraag functies aan of laat ons weten wat je waardeert.",
  robots: { index: false, follow: true },
};

export default async function FeedbackLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();

  return (
    <div className="antialiased bg-background h-screen flex flex-col overflow-hidden">
      <SessionProvider session={session}>
        <SidebarProvider>
          <AppSidebar />
          <div className="flex flex-col flex-1 min-h-0 w-full">
            <Header />
            <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
          </div>
        </SidebarProvider>
      </SessionProvider>
    </div>
  );
}
