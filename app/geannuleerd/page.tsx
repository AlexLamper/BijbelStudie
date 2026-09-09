import { Metadata } from "next";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";
import CanceledClient from "./CanceledClient";
import SceneShell from "../../components/scene/SceneShell";
import { SCENE_TREE, sceneSvg } from "../../components/scene/scene-svg";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('canceled', lng);
}

export default async function CanceledPage({
  searchParams,
}: {
  searchParams: Promise<{ interval?: string }>;
}) {
  // Stripe's cancel_url carries the interval the user backed out of, which is
  // the only thing that distinguishes an abandoned monthly from an abandoned
  // annual in the funnel.
  const { interval } = await searchParams;

  // The scene, rendered to an SVG on the server so it is in the first paint.
  // No `gateId`, so no canvas ever mounts: this is a checkout return and the
  // only thing that matters is how quickly the visitor can read that nothing
  // was charged. No navbar and no rail either - this route sits under the root
  // layout, which mounts no SessionProvider, and both of them read the session.
  return (
    <SceneShell svg={sceneSvg()} {...SCENE_TREE}>
      <CanceledClient interval={interval === "annual" ? "annual" : "monthly"} />
    </SceneShell>
  );
}
