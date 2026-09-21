/**
 * The study flow's two sounds, synthesised rather than downloaded.
 *
 * A step tick is a noise transient over a pitched glide and a chime is two sine
 * waves, so there is no reason to ship audio files for them: no extra request,
 * no decode, no 40KB of MP3 on a route people open on mobile data, and nothing
 * to keep in sync with a CDN. Web Audio builds both in a handful of nodes.
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
 * The swipe: a short tick with a pitched body under it, like a card being
 * snapped onto the next one.
 *
 * It replaced a 240ms band-passed noise sweep. That sweep was accurate - paper
 * moving past a microphone really does sound like that - and it was the wrong
 * sound for this: it took longer than the eye needed, it had no attack, and a
 * soft wash of noise on every step reads as the interface breathing rather than
 * as something happening. What a step transition wants is a TRANSIENT. The ear
 * dates an event by its attack, so the faster the onset, the more the sound
 * feels like the press that caused it.
 *
 * Two layers, 130ms end to end:
 *
 *  - the tick: 40ms of noise through a high-pass, up in 2ms and gone in 40, so
 *    it lands exactly on the press and never lingers into the animation.
 *  - the body: a triangle that glides 640 -> 380 Hz going forward and the other
 *    way going back. This is what keeps the direction the old sweep carried,
 *    and it gives the tick something to sit on - a tick alone is a mouse click.
 *
 * Peak gain stays low on both. This sits under the transition; it does not
 * announce itself, and it is heard forty times in a lesson.
 */
export function playSwipe(direction: 1 | -1) {
  const ctx = audio();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const forward = direction > 0;

    /* ── the tick ──────────────────────────────────────────────── */
    const tickLength = 0.04;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * tickLength));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      // Cubed decay, not linear: almost all of the energy is in the first few
      // milliseconds, which is what makes it read as a click and not a burst.
      samples[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 3;
    }

    const tick = ctx.createBufferSource();
    tick.buffer = buffer;

    const tickFilter = ctx.createBiquadFilter();
    tickFilter.type = 'highpass';
    // Going back is the quieter, duller of the two - stepping back is a
    // correction, and it should not sound like progress.
    tickFilter.frequency.value = forward ? 1500 : 1100;
    tickFilter.Q.value = 0.7;

    const tickGain = ctx.createGain();
    tickGain.gain.setValueAtTime(0, now);
    // Linear, not exponential: an exponential ramp from near-zero spends its
    // first milliseconds inaudible, which is the one thing a tick cannot do.
    tickGain.gain.linearRampToValueAtTime(forward ? 0.055 : 0.04, now + 0.002);
    tickGain.gain.exponentialRampToValueAtTime(0.0001, now + tickLength);

    tick.connect(tickFilter);
    tickFilter.connect(tickGain);
    tickGain.connect(ctx.destination);
    tick.start(now);
    tick.stop(now + tickLength);

    /* ── the body ──────────────────────────────────────────────── */
    const bodyLength = 0.13;
    const tone = ctx.createOscillator();
    tone.type = 'triangle';
    const from = forward ? 640 : 380;
    const to = forward ? 380 : 640;
    tone.frequency.setValueAtTime(from, now);
    tone.frequency.exponentialRampToValueAtTime(to, now + 0.1);

    // Takes the edge off the triangle's upper harmonics, which are what would
    // make this sound like a game rather than a page.
    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    toneFilter.frequency.value = 2200;

    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(0, now);
    toneGain.gain.linearRampToValueAtTime(0.05, now + 0.006);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + bodyLength);

    tone.connect(toneFilter);
    toneFilter.connect(toneGain);
    toneGain.connect(ctx.destination);
    tone.start(now);
    tone.stop(now + bodyLength);
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
