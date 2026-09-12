"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import NavTreeAvatar from "../levensboom/NavTreeAvatar";
import { useLevensboom } from "../../hooks/useLevensboom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { NAV_GROUPS, isNavActive } from "./nav";
import { useIsAdmin } from "./useIsAdmin";

/**
 * The app's sidebar, collapsed (design_handoff_web/PAGES-STUDIE-EN-LES.md).
 *
 * The lesson is a focus mode, so the 196 px column becomes a 64 px strip of
 * icons: the app mark in a head that lines up with the lesson's own bar, the
 * same items in the same order with a hairline where the sidebar has a group
 * label, and the tree at the foot.
 *
 * The items come from components/shell/nav.ts, which the full sidebar reads
 * too, so the two can never fall out of order.
 *
 * TWO DELIBERATE DEPARTURES FROM THE HANDOFF, both asked for:
 *
 *  - The head is 52 px, not the 64 the spec gives it. At 64 it did not line up
 *    with the lesson's own 52 px bar beside it, and two rules at different
 *    heights across one screen reads as a rendering fault. The bar keeps the
 *    52 the checklist measures; the head comes down to meet it.
 *  - Every item names itself on hover. The spec says "geen labels, geen
 *    tooltips", which is right for a rail you already know - but a strip of
 *    eight unlabelled glyphs makes you open the full sidebar to find out where
 *    a link goes. The label appears with NO delay (`delayDuration={0}`) and is
 *    portalled, so the rail can still scroll and clip without cutting it off.
 *
 * It paints from the `--les-*` tokens rather than the app's, because this rail
 * stands beside the lesson and the lesson has two palettes.
 */
export default function LessonRail() {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const { data } = useLevensboom();

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <nav
        aria-label="Hoofdnavigatie"
        className="flex w-16 flex-none flex-col items-center overflow-hidden border-r border-les-line bg-les-sb"
      >
        {/* 52 px: the height of the lesson's own bar beside it. */}
        <Link
          href="/dashboard"
          aria-label="BijbelStudie"
          className="flex h-[52px] w-full flex-none items-center justify-center border-b border-les-line no-underline"
        >
          <Image src="/app-icon.png" alt="" width={30} height={30} className="block rounded-[8px]" priority />
        </Link>

        <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-3">
          {NAV_GROUPS.map((group, groupIndex) => {
            if (group.adminOnly && !isAdmin) return null;
            return (
              <Fragment key={group.label}>
                {/* A hairline where the full sidebar puts a group label. */}
                {groupIndex > 0 && <span className="my-[7px] h-px w-[26px] flex-none bg-les-line" />}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(pathname, item.url);
                  return (
                    <Tooltip key={item.url}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.url}
                          aria-label={item.title}
                          data-track={item.tourId ? item.tourId.replace(/^nav-/, "sidebar_") : undefined}
                          className={[
                            "flex h-10 w-10 flex-none items-center justify-center rounded-[10px] no-underline transition-colors",
                            active ? "bg-les-nav-active text-les-accent" : "text-les-muted hover:bg-les-card",
                          ].join(" ")}
                        >
                          <Icon size={18} strokeWidth={1.8} />
                        </Link>
                      </TooltipTrigger>
                      <RailLabel>{item.title}</RailLabel>
                    </Tooltip>
                  );
                })}
              </Fragment>
            );
          })}
        </div>

        <div className="flex w-full flex-none justify-center border-t border-les-line py-[11px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/profiel/boom" aria-label="Je boom" className="relative block no-underline">
                <span className="block h-8 w-8 overflow-hidden rounded-full bg-sky">
                  <NavTreeAvatar size={32} showLevel={false} fallback={null} />
                </span>
                {data?.level != null && (
                  <span className="absolute -bottom-[3px] -right-[4px] rounded-full border border-les-line bg-les-bg px-[5px] py-px text-[10px] font-bold leading-none text-les-level tabular-nums">
                    {data.level}
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            <RailLabel>Je boom{data?.level != null ? ` · niveau ${data.level}` : ''}</RailLabel>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
}

/**
 * The label beside a rail item.
 *
 * Inked from the lesson's own tokens rather than the shared popover colours, so
 * it inverts with the lesson: near-black on white in the light lesson, the pale
 * ink on the night ground in the dark one. Either way it is the highest
 * contrast pair the palette has.
 */
function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <TooltipContent
      side="right"
      sideOffset={10}
      className="border-les-card-line bg-les-ink px-2.5 py-1.5 text-[12px] font-semibold text-les-bg shadow-lg"
    >
      {children}
    </TooltipContent>
  );
}
