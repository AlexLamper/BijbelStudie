import AppShell from "../../components/shell/AppShell"
import { VriendenkringView } from "../../components/friends/VriendenkringView"

/**
 * /vriendenkring - the feed, the kring and the verzoeken, in the shared app
 * shell like /dashboard and /notities.
 *
 * It is not /groepen: a kring is a reciprocal 1:1 graph, a groep is a room
 * with messages (VRIENDENKRING_PLAN.md §1).
 *
 * `padded={false}` because this page is a two-column grid with its own
 * gutters (40 px, and nothing at the foot so the feed runs on), and it owns
 * its scroll container - the shell's uniform 28/26 padding would fight both.
 * The same arrangement /lezen and /profiel/boom use.
 */
export default function VriendenkringPage() {
  return (
    <AppShell title="Vriendenkring" padded={false}>
      <VriendenkringView />
    </AppShell>
  )
}
