/**
 * The study flow's two sounds, synthesised rather than downloaded.
 *
 * A page-turn is a filtered noise burst and a chime is two sine waves, so there
 * is no reason to ship audio files for them: no extra request, no decode, no
 * 40KB of MP3 on a route people open on mobile data, and nothing to keep in sync
 * with a CDN. Web Audio builds both in a handful of nodes.
 *
 * Everything here fails silently. Audio is decoration - a browser without
 * `AudioContext`, a device with output muted, an autoplay policy that has not
 * seen a gesture yet: none of those are worth an error, and none of them may
 * break the step transition that triggered the sound.
 *
 * The context is created lazily on the first call, which is always inside a
 * click, key or drag handler, so it starts unsuspended. Browsers that suspend it
 * anyway (a tab restored from bfcache) get a resume() attempt per call.
 */

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!context) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    }
    if (context.state === 'suspended') void context.resume().catch(() => {});
    return context;
  } catch {
    return null;
  }
}

/**
 * The swipe: a short band-passed noise sweep, like a sheet of paper moving past.
 *
 * The sweep runs downwards going forward and upwards going back, which is the
 * whole trick - the ear reads a falling sweep as something leaving and a rising
 * one as something arriving, so the sound carries the same direction the
 * animation does. Peak gain is deliberately low; this should sit under the
 * transition, not announce itself.
 */
export function playSwipe(direction: 1 | -1) {
  const ctx = audio();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const duration = 0.24;

    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      // Slightly pink rather than white: pure white noise reads as a hiss, and
      // paper is weighted to the low end.
      samples[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 0.4;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    const from = direction > 0 ? 1100 : 420;
    const to = direction > 0 ? 320 : 1400;
    filter.frequency.setValueAtTime(from, now);
    filter.frequency.exponentialRampToValueAtTime(to, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + duration);
  } catch {
    /* decoration only */
  }
}

/** A soft two-note rise for finishing a lesson. */
export function playComplete() {
  const ctx = audio();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // A fifth, played as an arpeggio rather than a chord: two notes a beat apart
    // read as "and... done", where a chord reads as a notification.
    [
      { frequency: 587.33, at: 0 },
      { frequency: 880, at: 0.11 },
    ].forEach(({ frequency, at }) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;

      const gain = ctx.createGain();
      const start = now + at;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.075, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.4);
    });
  } catch {
    /* decoration only */
  }
}
