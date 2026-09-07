/**
 * The level-up chime, synthesised rather than downloaded.
 *
 * Same reasoning as lib/studySound.ts, which this deliberately mirrors: three
 * sine notes cost a handful of Web Audio nodes, so there is no MP3 to request,
 * decode, cache-bust or keep on a CDN for a sound that plays a few times a
 * year per user.
 *
 * It is decoration and fails silently. No `AudioContext`, output muted, or an
 * autoplay policy that has not seen a gesture: none of those may break the
 * celebration that triggered it. The caller skips this entirely under reduced
 * motion - someone who has asked for less movement has not asked for a chime.
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
 * A rising major triad, played as an arpeggio.
 *
 * Slower and softer than `playComplete` in studySound.ts on purpose. Finishing
 * a lesson happens most days and wants a brisk "done"; a level-up is rare and
 * wants something that opens out. Peak gain sits under a notification tone -
 * this should feel like light, not like an alert.
 */
export function playLevelUp() {
  const ctx = audio();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // D5, F#5, A5, then the octave a beat later.
    [
      { frequency: 587.33, at: 0 },
      { frequency: 739.99, at: 0.13 },
      { frequency: 880.0, at: 0.26 },
      { frequency: 1174.66, at: 0.46 },
    ].forEach(({ frequency, at }, index) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;

      const gain = ctx.createGain();
      const start = now + at;
      // The last note is the one that lands, so it is given the longest tail.
      const tail = index === 3 ? 1.1 : 0.5;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(index === 3 ? 0.07 : 0.055, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tail);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + tail + 0.05);
    });
  } catch {
    /* decoration only */
  }
}
