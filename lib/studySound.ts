/**
 * The study flow's two sounds, synthesised rather than downloaded.
 *
 * A step click is one band-passed noise burst and a chime is two sine waves,
 * so there is no reason to ship audio files for them: no extra request, no
 * decode, no 40KB of MP3 on a route people open on mobile data, and nothing to
 * keep in sync with a CDN. Web Audio builds both in a handful of nodes.
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
 * The swipe: a short, dry click. One burst of noise, 22 milliseconds, gone.
 *
 * Chosen after auditioning everything else, and the route there is worth
 * keeping because it explains the shape. A 240ms band-passed noise sweep was
 * too long and had no attack, so it read as the interface breathing. A tick
 * with a pitched triangle under it fixed the attack and added a note, and a
 * note becomes a tune by the fourth step - a lesson plays this six times. A
 * softly struck marimba had the same problem in a nicer register.
 *
 * What is left is the smallest thing that can mark an event: no pitch, no tail,
 * nothing to get used to. The ear dates an event by its attack, so a 1.5ms
 * onset is what makes it feel like the press that caused it rather than a
 * sound played afterwards. The cubed decay puts nearly all the energy in the
 * first few milliseconds, which is where the eye is too.
 *
 * The bandpass is doing the timbre: 2.4kHz forward, 1.7kHz back, Q 2.2. High
 * enough to stay crisp on a phone speaker, narrow enough not to hiss. Back is
 * the duller and quieter of the two - stepping back is a correction and should
 * not sound like progress.
 *
 * Peak gain is deliberately low. This is heard six times a lesson and must sit
 * under the transition, not on top of it.
 */
export function playSwipe(direction: 1 | -1) {
  const ctx = audio();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const forward = direction > 0;
    const length = 0.022;

    const frames = Math.max(1, Math.floor(ctx.sampleRate * length));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      samples[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 3.6;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const tone = ctx.createBiquadFilter();
    tone.type = 'bandpass';
    tone.frequency.value = forward ? 2400 : 1700;
    tone.Q.value = 2.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    // Linear into the peak, not exponential: a ramp that starts at near-zero
    // spends its first milliseconds inaudible, and on a click those
    // milliseconds ARE the sound.
    gain.gain.linearRampToValueAtTime(forward ? 0.05 : 0.04, now + 0.0015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

    source.connect(tone);
    tone.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + length);
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
