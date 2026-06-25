import { html, fmtDate } from '../core.js';
import { Badge } from '../components.js';
import { CollectionTab } from '../collection.js';

const CATEGORIES = ['AI', 'Terminal', 'GitHub', 'Web', 'General', 'Other'];
const catOptions = CATEGORIES.map((c) => ({ value: c, label: c }));

const SEED = [
  {
    id: 'seed-llm',
    term: 'LLM',
    definition:
      'Large Language Model — an AI trained on huge amounts of text that predicts the next word to generate human-like responses.',
    category: 'AI',
    dateAdded: '2026-06-24',
    _created: '2026-06-24T00:00:00.000Z',
  },
];

export function GlossaryTab({ accent }) {
  return html`<${CollectionTab}
    storeKey="glossary"
    accent=${accent}
    newLabel="Add term"
    modalTitle="term"
    seed=${SEED}
    searchKeys=${['term', 'definition']}
    fields=${[
      { name: 'term', label: 'Term', required: true, placeholder: 'e.g. API' },
      { name: 'definition', label: 'Your plain-English definition', type: 'textarea', required: true, rows: 4 },
      { name: 'category', label: 'Category', type: 'select', options: catOptions },
      { name: 'dateAdded', label: 'Date learned', type: 'date', default: 'today' },
    ]}
    sortOptions=${[
      { value: 'az', label: 'A → Z', cmp: (a, b) => a.term.localeCompare(b.term) },
      { value: 'new', label: 'Newest learned', cmp: (a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '') },
    ]}
    filters=${[{ key: 'category', label: 'Category', options: catOptions }]}
    emptyText="No terms yet."
    emptyHint="Add the first thing you learned today."
    renderCard=${(it) => html`<div class="glossary-card">
      <div class="card-head">
        <h3>${it.term}</h3>
        <${Badge} color=${accent}>${it.category}<//>
      </div>
      <p class="muted-text">${it.definition}</p>
      <div class="card-foot">Learned ${fmtDate(it.dateAdded)}</div>
    </div>`}
  />`;
}
