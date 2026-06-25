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

// useStore: useState backed by localStorage, persisted on every change.
export function useStore(key, initial) {
  const [state, setState] = useState(() => loadStore(key, initial));
  useEffect(() => {
    saveStore(key, state);
  }, [key, state]);
  return [state, setState];
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
  const date = new Date(d);
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
