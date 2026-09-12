"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

/**
 * Whether this account may see the Beheer row.
 *
 * Exactly the check the old sidebar did, lifted out so the 196 px sidebar and
 * the 64 px lesson rail ask it the same way: the session flag first, then one
 * /api/user call for accounts whose JWT predates that flag. This is a redesign
 * of the presentation layer, not of who sees the admin link - the guard itself
 * still lives in app/admin/layout.tsx.
 */
export function useIsAdmin(): boolean {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean>(!!session?.user?.isAdmin);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session?.user?.isAdmin) {
      setIsAdmin(true);
      return;
    }
    fetch("/api/user")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.isAdmin) setIsAdmin(true);
      })
      .catch(() => {});
  }, [session, status]);

  return isAdmin;
}
