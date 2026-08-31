import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import SessionProvider from "../../components/providers/SessionProvider";
import { Header } from "../../components/layout/header";
import { AppSidebar } from "../../components/layout/app-sidebar";
import { SidebarProvider } from "../../components/ui/sidebar";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { authOptions } from "../../lib/authOptions";
import connectMongoDB from "../../lib/mongodb";
import User from "../../models/User";
import { isAdminEmail } from "../../lib/adminEmails";

// Secret admin-only sandbox: three parallel redesigns of /studies live at
// /studies-lab/a, /studies-lab/b, /studies-lab/c. Gated exactly like /admin so
// no non-admin can reach them; not in the sitemap or pageMetadata.
export const metadata = { robots: { index: false, follow: false } };

export default async function StudiesLabLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/inloggen");
  }

  await connectMongoDB();
  const dbUser = await User.findOne({ email: session.user.email })
    .select("isAdmin")
    .lean<{ isAdmin?: boolean }>();

  if (!dbUser?.isAdmin && !isAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }

  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;

  return (
    <div className="antialiased bg-background h-screen flex flex-col overflow-hidden">
      <SessionProvider session={session}>
        <SidebarProvider>
          <AppSidebar />
          <div className="flex flex-col flex-1 min-h-0 w-full">
            <Header params={{ lng }} />
            <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
          </div>
        </SidebarProvider>
      </SessionProvider>
    </div>
  );
}
