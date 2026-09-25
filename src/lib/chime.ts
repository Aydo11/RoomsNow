/**
 * A short, bright two-note chime for good news: an advert submitted, an advert,
 * verification or accreditation approved, a boost or membership going through.
 * It's synthesised with the Web Audio API, so there's no audio file to download.
 *
 * Browsers only allow sound once someone has interacted with the page. If they
 * haven't yet (for example, they've just opened RoomsNow from an email link),
 * this stays silent rather than playing late on their next click. People can
 * turn it off from their settings; the choice is kept in this browser only.
 */
const STORAGE_KEY = "roomsnow:sounds";
/** A chime that can't start within this window is dropped, never played late. */
const MAX_DELAY_MS = 1500;

let context: AudioContext | null = null;

export function soundsEnabled() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundsEnabled(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private browsing or blocked storage: the chime just stays on.
  }
}

function hasInteracted() {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  // Browsers without the API (older Safari) decide for themselves via resume().
  return activation ? activation.hasBeenActive : true;
}

function ring(ctx: AudioContext) {
  const now = ctx.currentTime + 0.02;
  const master = ctx.createGain();
  master.gain.value = 0.2;
  master.connect(ctx.destination);

  // Two rising notes (E6, then B6), each a small bell: a clear fundamental plus
  // two quiet inharmonic partials that give it the "ding" shimmer.
  const notes: [number, number][] = [
    [1318.5, 0],
    [1975.5, 0.11],
  ];
  const partials: [number, number, number][] = [
    [1, 1, 1.1],
    [2.76, 0.16, 0.45],
    [5.4, 0.03, 0.25],
  ];
  for (const [frequency, offset] of notes) {
    for (const [ratio, level, decay] of partials) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + offset;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency * ratio;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(level, start + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);
      oscillator.connect(gain).connect(master);
      oscillator.start(start);
      oscillator.stop(start + decay + 0.05);
    }
  }
}

export function playSuccessChime() {
  if (typeof window === "undefined" || !soundsEnabled() || !hasInteracted()) return;
  const AudioCtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;
  try {
    context ??= new AudioCtor();
    const ctx = context;
    if (ctx.state === "running") {
      ring(ctx);
      return;
    }
    const requestedAt = Date.now();
    ctx
      .resume()
      .then(() => {
        if (ctx.state === "running" && Date.now() - requestedAt < MAX_DELAY_MS) ring(ctx);
      })
      .catch(() => undefined);
  } catch {
    // Sound is a nice extra. Never let it break the page.
  }
}
