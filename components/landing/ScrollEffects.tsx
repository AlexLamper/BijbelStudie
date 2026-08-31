"use client"

import { useEffect } from "react"

/**
 * The landing page's second and last client island, next to the FAQ accordion.
 * It renders nothing: it wires one IntersectionObserver across every `.reveal`
 * in the document and one across the header sentinel, which is why ~1200 lines
 * of marketing markup can stay server components. Making each animated block
 * its own client component would have serialised the whole page into the RSC
 * payload to animate a translate.
 *
 * Progressive enhancement is the entire design. The hidden state lives behind
 * `html.js-reveal`, and this effect is the only thing that adds that class - so
 * a crawler, a bundle that never arrives, a browser without IntersectionObserver
 * and a visitor who asked for reduced motion all keep the fully visible page
 * that was served. Nothing here can hide content; it can only choose to animate
 * content that is already there.
 */
export function ScrollEffects() {
  useEffect(() => {
    const root = document.documentElement
    const supported = "IntersectionObserver" in window

    // A one-pixel sentinel at the top of the document rather than a scroll
    // listener: "is the header stuck" is exactly "is that pixel off screen",
    // and the observer answers it without any per-frame work on the main thread.
    const sentinel = document.getElementById("landing-top-sentinel")
    let stuckObserver: IntersectionObserver | undefined
    if (supported && sentinel) {
      stuckObserver = new IntersectionObserver(
        ([entry]) => root.classList.toggle("is-stuck", !entry.isIntersecting),
        { threshold: 0 }
      )
      stuckObserver.observe(sentinel)
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".reveal"))
    let revealObserver: IntersectionObserver | undefined

    if (supported && !reduced && targets.length > 0) {
      // Everything already on screen is marked visible *before* the hidden
      // state is switched on. This effect runs after the server HTML has
      // painted, so hiding a block the visitor is currently reading would show
      // as content vanishing and returning - the one failure mode a scroll
      // reveal must never have.
      for (const el of targets) {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-visible")
        }
      }
      root.classList.add("js-reveal")

      revealObserver = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            entry.target.classList.add("is-visible")
            // Reveals are one-way. Re-hiding on scroll-up makes a long page
            // feel unstable and re-triggers the motion on every pass.
            revealObserver?.unobserve(entry.target)
          }
        },
        // Held back from the bottom edge so a block starts moving once it is
        // properly in view, not while it is still a sliver.
        { rootMargin: "0px 0px -12% 0px", threshold: 0.01 }
      )

      for (const el of targets) {
        if (!el.classList.contains("is-visible")) revealObserver.observe(el)
      }
    }

    return () => {
      stuckObserver?.disconnect()
      revealObserver?.disconnect()
      // Leaving `js-reveal` behind would strand any still-hidden block at
      // opacity 0 with no observer left to reveal it.
      root.classList.remove("js-reveal", "is-stuck")
    }
  }, [])

  return null
}

export default ScrollEffects
