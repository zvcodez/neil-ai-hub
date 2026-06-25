import { html, fmtDate, loadStore, saveStore, uid, emitStoreChange } from '../core.js';
import { CollectionTab } from '../collection.js';

const CATEGORIES = ['Project Launch', 'Learning', 'Achievement', 'Milestone'];
const catOptions = CATEGORIES.map((c) => ({ value: c, label: c }));
const catColor = {
  'Project Launch': '#2563eb',
  Learning: '#14b8a6',
  Achievement: '#f59e0b',
  Milestone: '#a855f7',
};

const SEED = [
  {
    id: 'seed-portfolio',
    date: '2026-06-24',
    title: 'Launched neil-portfolio',
    description: 'Shipped my first portfolio site — the official start of my AI learning journey.',
    category: 'Project Launch',
    _created: '2026-06-24T00:00:00.000Z',
  },
];

// Cross-tab helper: append a launch entry from the Projects tab.
export function addTimelineEntry({ title, description, date, category = 'Project Launch' }) {
  const items = loadStore('timeline', SEED);
  if (items.some((it) => it.title === title && it.category === category)) return false;
  const entry = { id: uid(), title, description, date, category, _created: new Date().toISOString() };
  const next = [entry, ...items];
  saveStore('timeline', next);
  emitStoreChange('timeline', next, { external: false });
  return true;
}

export function TimelineTab({ accent }) {
  return html`<${CollectionTab}
    storeKey="timeline"
    accent=${accent}
    newLabel="Add entry"
    modalTitle="timeline entry"
    seed=${SEED}
    searchKeys=${['title', 'description']}
    fields=${[
      { name: 'date', label: 'Date', type: 'date', default: 'today', required: true },
      { name: 'title', label: 'Title / headline', required: true },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { name: 'category', label: 'Category', type: 'select', options: catOptions },
    ]}
    sortOptions=${[
      { value: 'new', label: 'Newest first', cmp: (a, b) => (b.date || '').localeCompare(a.date || '') },
      { value: 'old', label: 'Oldest first', cmp: (a, b) => (a.date || '').localeCompare(b.date || '') },
    ]}
    filters=${[{ key: 'category', label: 'Type', options: catOptions }]}
    emptyText="Your timeline is empty."
    emptyHint="Log your first milestone and watch your journey build."
    renderItems=${({ items, edit, remove }) => html`<div class="timeline">
      ${items.map((it) => {
        const color = catColor[it.category] || accent;
        return html`<div class="tl-row" key=${it.id}>
          <div class="tl-date">
            <span>${fmtDate(it.date)}</span>
          </div>
          <div class="tl-line">
            <span class="tl-dot" style=${{ background: color, boxShadow: `0 0 0 4px color-mix(in srgb, ${color} 25%, transparent)` }}></span>
          </div>
          <div class="tl-card card" style=${{ borderLeftColor: color }} onClick=${() => edit(it)}>
            <div class="card-actions">
              <button class="icon-btn danger" title="Delete"
                onClick=${(e) => { e.stopPropagation(); remove(it); }}>×</button>
            </div>
            <span class="tl-tag" style=${{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>${it.category}</span>
            <h3>${it.title}</h3>
            ${it.description && html`<p class="muted-text">${it.description}</p>`}
          </div>
        </div>`;
      })}
    </div>`}
  />`;
}
