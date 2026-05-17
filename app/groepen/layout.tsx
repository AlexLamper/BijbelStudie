import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import SessionProvider from "../../components/providers/SessionProvider"
import { Header } from "../../components/layout/header"
import { AppSidebar } from "../../components/layout/app-sidebar"
import { SidebarProvider } from "../../components/ui/sidebar"

export const metadata: Metadata = {
  title: "Groepen",
  description: "Bijbelstudie in groepsverband",
}

export default async function GroepenLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <SessionProvider session={session}>
        <SidebarProvider>
          <AppSidebar />
          <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </SessionProvider>
    </div>
  )
}
