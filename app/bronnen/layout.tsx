import SessionProvider from "../../components/providers/SessionProvider";

/**
 * Providers only, the same as /help: every page under /bronnen is
 * force-static, so no session is handed down - the shell's sidebar and top bar
 * fetch it on the client and show the account (or "Inloggen") once known. The
 * text never waits on that.
 */
export default function BronnenLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
