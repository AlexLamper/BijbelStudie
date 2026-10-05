# VRIENDENKRING_PLAN.md lives in the app repo

The Vriendenkring design doc is **not** in this repo. It is at:

    C:\Projects\bijbelstudie-app\VRIENDENKRING_PLAN.md

These files cite it as though it were local, which is why this pointer exists:

- `models/FriendProfile.js`
- `models/FriendPost.js`
- `lib/friends/types.ts`
- `lib/friends/discovery.ts`
- `lib/accountArchive.ts`
- `app/vriendenkring/page.tsx`

It is kept in the app repo on purpose: the contacts half of the feature is
app-only (a browser cannot read an address book), and the doc covers both
clients. The wire contract it describes is `lib/friends/types.ts` here, and
`features/friends/data/friend_models.dart` there - the plan says changes to
those go in one pass across both repos.
