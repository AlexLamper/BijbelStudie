import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import SessionProvider from "../../components/providers/SessionProvider";
import { Header } from "../../components/layout/header";
import { AppSidebar } from "../../components/layout/app-sidebar";
import { SidebarProvider } from "../../components/ui/sidebar";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";
import { authOptions } from "../../lib/authOptions";
import connectMongoDB from "../../lib/mongodb";
import User from "../../models/User";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata("admin", lng);
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  await connectMongoDB();
  const dbUser = await User.findOne({ email: session.user.email })
    .select("isAdmin")
    .lean<{ isAdmin?: boolean }>();

  if (!dbUser?.isAdmin) {
    redirect("/dashboard");
  }

  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;

  return (
    <div className="antialiased bg-background">
      <SessionProvider session={session}>
        <SidebarProvider>
          <AppSidebar />
          <div className="min-h-screen mx-auto w-full">
            <Header params={{ lng }} />
            {children}
          </div>
        </SidebarProvider>
      </SessionProvider>
    </div>
  );
}
