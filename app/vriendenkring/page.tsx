import AppShell from "../../components/shell/AppShell"
import { VriendenkringView } from "../../components/friends/VriendenkringView"

/**
 * /vriendenkring - the feed, the kring and the verzoeken, in the shared app
 * shell like /dashboard and /notities.
 *
 * It is not /groepen: a kring is a reciprocal 1:1 graph, a groep is a room
 * with messages (VRIENDENKRING_PLAN.md §1).
 */
export default function VriendenkringPage() {
  return (
    <AppShell title="Vriendenkring">
      <VriendenkringView />
    </AppShell>
  )
}
