"use client";

import { useSession } from "next-auth/react";
import { useIsPro } from "./useIsPro";
import { useIsAdmin } from "../components/shell/useIsAdmin";
import type { CommandContext } from "../lib/commands/types";

/**
 * Who is asking, for the command palette's visibility rules. The same three
 * sources as the sidebar: the session, useIsPro and useIsAdmin.
 */
export function useCommandContext(): CommandContext {
  const { data: session, status } = useSession();
  const isPro = useIsPro();
  const isAdmin = useIsAdmin();
  return {
    signedIn: status === "authenticated" && !!session?.user,
    isPro,
    isAdmin,
    loading: status === "loading",
  };
}
