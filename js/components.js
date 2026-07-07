// Reusable UI components for Neil AI Hub.
import { html, ReactDOM, useState, useEffect, useRef, today as todayStr } from './core.js';

// ---- Icons (feather-style stroke SVGs) -------------------------------------
const ICON_PATHS = {
  projects: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  timeline: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  glossary: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M19 19H6a2 2 0 0 0-2 2"/>',
  shortcuts: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/>',
  resources: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  ideas: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
  career: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  skills: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
  github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-1-2.6c3-.3 6-1.5 6-6.6a5 5 0 0 0-1.4-3.5 4.7 4.7 0 0 0-.1-3.5s-1.1-.3-3.5 1.3a12 12 0 0 0-6 0C6.6 1.6 5.5 1.9 5.5 1.9a4.7 4.7 0 0 0-.1 3.5A5 5 0 0 0 4 8.9c0 5 3 6.3 6 6.6a3.4 3.4 0 0 0-1 2.6V22"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  star: '<path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  flag: '<path d="M4 22V4h13l-2 4 2 4H4"/>',
  refresh: '<path d="M21 2v6h-6M3 22v-6h6"/><path d="M21 8a9 9 0 0 0-15-3L3 8M3 16a9 9 0 0 0 15 3l3-3"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  cloud: '<path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6.5 19z"/>',
  'cloud-off': '<path d="M3 3l18 18"/><path d="M17.5 19a4.5 4.5 0 0 0 2.9-7.9M8.3 6.3A6 6 0 0 1 18 10a4.5 4.5 0 0 1 .5 9H7"/>',
};

export function Icon({ name, size = 18, fill = false }) {
  const inner = ICON_PATHS[name] || '';
  return html`<svg
    class="icon"
    width=${size}
    height=${size}
    viewBox="0 0 24 24"
    fill=${fill ? 'currentColor' : 'none'}
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    dangerouslySetInnerHTML=${{ __html: inner }}
  />`;
}

// ---- Badge ------------------------------------------------------------------
export function Badge({ children, tone = 'default', color }) {
  const style = color
    ? { background: `color-mix(in srgb, ${color} 18%, transparent)`, color, borderColor: `color-mix(in srgb, ${color} 40%, transparent)` }
    : undefined;
  return html`<span class=${`badge badge-${tone}`} style=${style}>${children}</span>`;
}

// ---- Buttons ----------------------------------------------------------------
export function Button({ children, onClick, variant = 'default', icon, type = 'button', title, disabled }) {
  return html`<button
    type=${type}
    class=${`btn btn-${variant}`}
    onClick=${onClick}
    title=${title}
    disabled=${disabled}
  >
    ${icon && html`<${Icon} name=${icon} size=${15} />`}
    ${children}
  </button>`;
}

export function IconButton({ name, onClick, title, danger }) {
  return html`<button
    type="button"
    class=${`icon-btn ${danger ? 'danger' : ''}`}
    onClick=${onClick}
    title=${title}
    aria-label=${title}
  ><${Icon} name=${name} size=${16} /></button>`;
}

// ---- Star rating ------------------------------------------------------------
export function StarRating({ value = 0, onChange, readOnly = false, size = 16 }) {
  return html`<div class=${`stars ${readOnly ? 'readonly' : ''}`}>
    ${[1, 2, 3, 4, 5].map(
      (n) => html`<button
        key=${n}
        type="button"
        class=${`star ${n <= value ? 'on' : ''}`}
        onClick=${readOnly ? undefined : () => onChange(n === value ? 0 : n)}
        tabIndex=${readOnly ? -1 : 0}
      ><${Icon} name="star" size=${size} fill=${n <= value} /></button>`
    )}
  </div>`;
}

// ---- Empty state ------------------------------------------------------------
export function EmptyState({ icon = 'ideas', text, hint }) {
  return html`<div class="empty">
    <${Icon} name=${icon} size=${40} />
    <p>${text}</p>
    ${hint && html`<span>${hint}</span>`}
  </div>`;
}

// ---- Modal ------------------------------------------------------------------
// Rendered through a portal onto <body> so no ancestor with backdrop-filter/
// transform (e.g. the sticky content header) can become the containing block
// for the fixed backdrop — that trapped modals inside the header on iOS.
export function Modal({ title, onClose, children, accent }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // iOS-safe scroll lock: overflow:hidden alone doesn't stop body scroll in
    // Safari; pinning the body and restoring the scroll offset on close does.
    const scrollY = window.scrollY;
    const b = document.body.style;
    const prev = {
      position: b.position, top: b.top, left: b.left,
      right: b.right, width: b.width, overflow: b.overflow,
    };
    b.position = 'fixed';
    b.top = `-${scrollY}px`;
    b.left = '0';
    b.right = '0';
    b.width = '100%';
    b.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      Object.assign(b, prev);
      window.scrollTo(0, scrollY);
    };
  }, []);
  return ReactDOM.createPortal(
    html`<div class="modal-backdrop" onClick=${onClose}>
      <div
        class="modal"
        style=${accent ? { '--accent': accent } : undefined}
        onClick=${(e) => e.stopPropagation()}
      >
        <div class="modal-head">
          <h3>${title}</h3>
          <${IconButton} name="close" title="Close" onClick=${onClose} />
        </div>
        <div class="modal-body">${children}</div>
      </div>
    </div>`,
    document.body
  );
}

// ---- Declarative Form -------------------------------------------------------
// fields: [{ name, label, type, options, placeholder, mono, required, help, full }]
// type: text | textarea | url | date | number | select | tags | stars | checkbox
export function Form({ fields, initial, onSubmit, onCancel, submitLabel = 'Save' }) {
  const seed = () => {
    const base = {};
    for (const f of fields) {
      let val = initial ? initial[f.name] : undefined;
      if (val === undefined) {
        if (f.type === 'tags') val = [];
        else if (f.type === 'stars' || f.type === 'number') val = f.default ?? (f.type === 'stars' ? 0 : '');
        else if (f.type === 'checkbox') val = f.default ?? false;
        else if (f.type === 'date') val = f.default === 'today' ? todayStr() : (f.default ?? '');
        else if (f.type === 'select') val = f.default ?? (f.options?.[0]?.value ?? '');
        else val = f.default ?? '';
      }
      base[f.name] = val;
    }
    return base;
  };
  const [values, setValues] = useState(seed);
  const set = (name, v) => setValues((cur) => ({ ...cur, [name]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  return html`<form class="form" onSubmit=${submit}>
    <div class="form-grid">
      ${fields.map((f) => html`<${Field} key=${f.name} field=${f} value=${values[f.name]} set=${set} />`)}
    </div>
    <div class="form-actions">
      <${Button} variant="ghost" onClick=${onCancel}>Cancel<//>
      <${Button} variant="primary" type="submit" icon="check">${submitLabel}<//>
    </div>
  </form>`;
}

function Field({ field, value, set }) {
  const { name, label, type = 'text', placeholder, options, mono, required, help, full } = field;
  const id = 'f_' + name;
  let control;
  if (type === 'textarea') {
    control = html`<textarea id=${id} value=${value} placeholder=${placeholder}
      required=${required} rows=${field.rows || 3}
      onInput=${(e) => set(name, e.target.value)} />`;
  } else if (type === 'select') {
    control = html`<select id=${id} value=${value} onChange=${(e) => set(name, e.target.value)}>
      ${options.map((o) => html`<option key=${o.value} value=${o.value}>${o.label}</option>`)}
    </select>`;
  } else if (type === 'tags') {
    control = html`<${TagsInput} value=${value} onChange=${(v) => set(name, v)} placeholder=${placeholder} />`;
  } else if (type === 'stars') {
    control = html`<${StarRating} value=${value} onChange=${(v) => set(name, v)} size=${20} />`;
  } else if (type === 'checkbox') {
    control = html`<label class="check-inline">
      <input type="checkbox" checked=${!!value} onChange=${(e) => set(name, e.target.checked)} />
      <span>${field.checkboxLabel || label}</span>
    </label>`;
  } else {
    const inputType = type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'url' ? 'url' : 'text';
    control = html`<input id=${id} type=${inputType} value=${value} placeholder=${placeholder}
      required=${required} class=${mono ? 'mono' : ''}
      onInput=${(e) => set(name, e.target.value)} />`;
  }
  return html`<div class=${`field ${full || type === 'textarea' ? 'field-full' : ''}`}>
    ${type !== 'checkbox' && html`<label for=${id}>${label}${required && html`<span class="req">*</span>`}</label>`}
    ${control}
    ${help && html`<span class="field-help">${help}</span>`}
  </div>`;
}

function TagsInput({ value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  return html`<div class="tags-input">
    <div class="tags-list">
      ${value.map(
        (t) => html`<span key=${t} class="tag">
          ${t}
          <button type="button" onClick=${() => onChange(value.filter((x) => x !== t))}>×</button>
        </span>`
      )}
    </div>
    <input
      type="text"
      value=${draft}
      placeholder=${placeholder || 'Type and press Enter'}
      onInput=${(e) => setDraft(e.target.value)}
      onKeyDown=${(e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          add();
        }
      }}
      onBlur=${add}
    />
  </div>`;
}

// ---- Search box -------------------------------------------------------------
export function SearchBox({ value, onChange, placeholder = 'Search...' }) {
  return html`<div class="searchbox">
    <${Icon} name="search" size=${16} />
    <input type="search" value=${value} placeholder=${placeholder}
      onInput=${(e) => onChange(e.target.value)} />
  </div>`;
}

// ---- Segmented control / filter chips --------------------------------------
export function Segmented({ options, value, onChange }) {
  return html`<div class="segmented">
    ${options.map(
      (o) => html`<button
        key=${o.value}
        type="button"
        class=${value === o.value ? 'active' : ''}
        onClick=${() => onChange(o.value)}
      >${o.label}</button>`
    )}
  </div>`;
}

// ---- Confirm-delete inline helper ------------------------------------------
export function useConfirm() {
  return (msg, fn) => {
    if (window.confirm(msg)) fn();
  };
}
