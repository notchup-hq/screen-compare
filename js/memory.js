// Remembered screens: the only code in the page that touches browser storage. Nothing is stored until
// the visitor ticks "Remember this screen on this browser"; nothing else is ever stored and nothing is
// sent anywhere. One versioned key holds up to five profiles. Every access is wrapped in try/catch, so
// the page works the same when storage is blocked, full or empty (a private window).
//
// A profile is { name, sig: { w, h, dpr }, saved, from | size (+ res | ratio) | cal }: the same way of
// knowing your screen the link uses, plus the screen signature that says which screen it was made on.
// A card scale (cal, CSS px per mm) is only right at the same devicePixelRatio, which is why the
// signature includes it.

import { parseState, serializeState } from './state.js';

export const STORAGE_KEY = 'screen-compare:v1';
export const MAX_PROFILES = 5;
export const NAME_MAX = 40;
const DPR_TOLERANCE = 0.01;

/** The signature of a screen: its size in CSS pixels and its pixel ratio. */
export function signatureOf({ width, height, dpr }) {
  return { w: Math.round(width), h: Math.round(height), dpr: Number(dpr) };
}

const sameSignature = (a, b) => a.w === b.w && a.h === b.h && Math.abs(a.dpr - b.dpr) <= DPR_TOLERANCE;

/** The profile made on this screen (newest when there are several), or null. */
export function matchProfile(profiles, sig) {
  let best = null;
  for (const p of profiles) {
    if (sameSignature(p.sig, sig) && (!best || p.saved > best.saved)) best = p;
  }
  return best;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The quiet line under a remembered screen: when it was saved, or, after twelve months, a nudge to
 * check it. `saved` and `now` are milliseconds.
 */
export function rememberedLine(saved, now = Date.now()) {
  const d = new Date(saved);
  const expires = new Date(saved);
  expires.setFullYear(expires.getFullYear() + 1);
  if (!Number.isFinite(d.getTime())) return 'Remembered on this browser';
  if (expires.getTime() < now) return 'Remembered on this browser over a year ago, still right?';
  return `Remembered on this browser, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** A name from what the visitor typed: trimmed and cut to NAME_MAX; empty gives null. */
export function cleanName(name) {
  const n = typeof name === 'string' ? name.trim().slice(0, NAME_MAX).trim() : '';
  return n || null;
}

/** The default name of a screen (from `yourScreen`): the model's short name, or its size. */
export function defaultName(screen) {
  if (screen.basis === 'model') return screen.short ?? screen.name;
  return `${Math.round(screen.diagonalIn * 10) / 10}" screen`;
}

/**
 * One stored entry made safe, or null. The way of knowing the screen goes through the same checks as a
 * link (a model that no longer exists or a size out of range is dropped), so a stale or edited entry
 * can never put the page in a state a link could not.
 */
export function cleanProfile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw.sig;
  if (!s || !(s.w > 0) || !(s.h > 0) || !(s.dpr > 0) || !Number.isFinite(s.dpr)) return null;
  const name = cleanName(raw.name);
  if (!name) return null;
  const y = parseState(
    serializeState({ from: raw.from ?? null, size: raw.size ?? null, res: raw.res ?? null, ratio: raw.ratio ?? null, cal: raw.cal ?? null, to: 'x', fill: false }),
    { from: null, to: null },
  );
  if (!y.cal && !y.size && !y.from) return null;
  return {
    name,
    sig: { w: Math.round(s.w), h: Math.round(s.h), dpr: s.dpr },
    saved: Number.isFinite(raw.saved) ? raw.saved : 0,
    // The strongest way wins, as in the link: a card measurement, then a size, then a model.
    from: y.cal || y.size ? null : y.from,
    size: y.cal ? null : y.size,
    res: y.cal ? null : y.res,
    ratio: y.cal ? null : y.ratio,
    cal: y.cal,
  };
}

/** Newest first, at most MAX_PROFILES. */
export function cleanProfiles(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(cleanProfile)
    .filter(Boolean)
    .sort((a, b) => b.saved - a.saved)
    .slice(0, MAX_PROFILES);
}

/**
 * `profile` added to `profiles`. A profile for the same screen replaces the old one but keeps its
 * name (the owner may have renamed it); beyond MAX_PROFILES the oldest is dropped.
 */
export function upsertProfile(profiles, profile) {
  const old = profiles.find((p) => sameSignature(p.sig, profile.sig));
  const next = { ...profile, name: old ? old.name : profile.name };
  const rest = profiles.filter((p) => !sameSignature(p.sig, profile.sig));
  return [next, ...rest].sort((a, b) => b.saved - a.saved).slice(0, MAX_PROFILES);
}

/** @param {() => Storage} getStorage the storage to use; reading it may throw (blocked storage). */
export function createMemory(getStorage = () => window.localStorage) {
  const store = () => {
    try { return getStorage() ?? null; } catch { return null; }
  };

  /** Can the page read its storage at all? Only the real key is touched. */
  function available() {
    const s = store();
    if (!s) return false;
    try { s.getItem(STORAGE_KEY); return true; } catch { return false; }
  }

  function list() {
    const s = store();
    if (!s) return [];
    try {
      const raw = s.getItem(STORAGE_KEY);
      if (raw === null) return [];
      const data = JSON.parse(raw);
      return data && data.v === 1 ? cleanProfiles(data.profiles) : [];
    } catch {
      return [];
    }
  }

  function write(profiles) {
    const s = store();
    if (!s) return false;
    try {
      if (profiles.length) s.setItem(STORAGE_KEY, JSON.stringify({ v: 1, profiles }));
      else s.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  return {
    available,
    list,
    /** Remember (or update) a profile. True when it was stored. */
    save(profile) {
      const clean = cleanProfile(profile);
      return clean ? write(upsertProfile(list(), clean)) : false;
    },
    /** Rename the profile of a screen. False when the name is empty or nothing was stored. */
    rename(sig, name) {
      const n = cleanName(name);
      const all = list();
      if (!n || !all.some((p) => sameSignature(p.sig, sig))) return false;
      return write(all.map((p) => (sameSignature(p.sig, sig) ? { ...p, name: n } : p)));
    },
    remove(sig) {
      return write(list().filter((p) => !sameSignature(p.sig, sig)));
    },
    /** Forget the profile of a screen and hand it back (so Undo can save it again); null if there was none. */
    take(sig) {
      const all = list();
      const gone = all.find((p) => sameSignature(p.sig, sig));
      if (!gone) return null;
      return write(all.filter((p) => p !== gone)) ? gone : null;
    },
    clear() {
      return write([]);
    },
  };
}
