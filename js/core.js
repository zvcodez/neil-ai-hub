// Core bindings + utilities for Neil AI Hub.
// React, ReactDOM and htm are loaded as UMD globals (see index.html) so this
// no-build app needs no compiler/toolchain.

export const React = window.React;
export const ReactDOM = window.ReactDOM;
export const html = window.htm.bind(React.createElement);

export const {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  createContext,
  useContext,
} = React;

// ---- localStorage helpers ---------------------------------------------------
const PREFIX = 'nah:';

export function loadStore(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (e) {
    console.warn('loadStore failed for', key, e);
    return fallback;
  }
}

export function saveStore(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('saveStore failed for', key, e);
  }
}

// ---- store change pub/sub (powers cross-device sync) ------------------------
// Per-key React setters, so a remote pull can push new values into mounted tabs.
const keySubscribers = new Map(); // key -> Set<setState>
// Global listeners notified whenever a value changes locally (the sync engine).
const changeListeners = new Set(); // fn(key, value, meta)

export function onStoreChange(fn) {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

export function emitStoreChange(key, value, meta = {}) {
  changeListeners.forEach((fn) => {
    try { fn(key, value, meta); } catch (e) { console.warn('store listener failed', e); }
  });
}

// Apply a value that came from outside React (e.g. a remote sync pull):
// persist it and update any mounted component subscribed to that key, WITHOUT
// re-emitting a local change (so it does not get pushed straight back).
export function applyExternalChange(key, value) {
  saveStore(key, value);
  const subs = keySubscribers.get(key);
  if (subs) subs.forEach((set) => set(value));
}

// useStore: useState backed by localStorage. Writes persist + broadcast so the
// sync engine can push them, and remote pulls can update this component.
export function useStore(key, initial) {
  const [state, setState] = useState(() => loadStore(key, initial));

  useEffect(() => {
    let subs = keySubscribers.get(key);
    if (!subs) { subs = new Set(); keySubscribers.set(key, subs); }
    subs.add(setState);
    return () => { subs.delete(setState); };
  }, [key]);

  const update = useCallback(
    (next) => {
      setState((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        saveStore(key, value);
        emitStoreChange(key, value, { external: false });
        return value;
      });
    },
    [key]
  );

  return [state, update];
}

// ---- misc helpers -----------------------------------------------------------
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(d) {
  if (!d) return '';
  // Date-only strings parse as UTC midnight, which renders as the previous
  // day in western timezones — pin them to local noon instead.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00' : d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function relativeDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return d;
  const diff = Date.now() - date.getTime();
  const day = 86400000;
  if (diff < day) return 'today';
  if (diff < 2 * day) return 'yesterday';
  if (diff < 30 * day) return `${Math.floor(diff / day)} days ago`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))} mo ago`;
  return `${Math.floor(diff / (365 * day))} yr ago`;
}

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

// Case-insensitive substring match across multiple fields.
export function matchesQuery(query, ...fields) {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some((f) => (f || '').toString().toLowerCase().includes(q));
}
