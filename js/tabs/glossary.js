import { html } from '../core.js';
import { Badge, IconButton } from '../components.js';
import { CollectionTab } from '../collection.js';

const CATEGORIES = ['AI', 'Terminal', 'GitHub', 'Web', 'General', 'Other'];
const catOptions = CATEGORIES.map((c) => ({ value: c, label: c }));

// Order section headings render in. Anything not listed falls to the end (A→Z).
const SECTION_ORDER = [
  'Core concepts',
  'Context management',
  'Before big changes',
  'Staying on track',
  'Navigation',
  'Cost & performance',
  'Diagnostics',
  'Setup & config',
  'Code review',
];

const SEED = [
  {
    id: 'seed-llm',
    term: 'LLM',
    definition:
      'Large Language Model — an AI trained on huge amounts of text that predicts the next word to generate human-like responses.',
    example: 'When you chat with Claude or ChatGPT, an LLM is what reads your message and writes the reply.',
    category: 'AI',
    section: 'Core concepts',
    _created: '2026-06-24T00:00:00.000Z',
  },
];

function groupBySection(items) {
  const groups = new Map();
  for (const it of items) {
    const key = it.section || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  const rank = (name) => {
    const i = SECTION_ORDER.indexOf(name);
    return i === -1 ? SECTION_ORDER.length : i;
  };
  return [...groups.entries()].sort((a, b) => {
    const d = rank(a[0]) - rank(b[0]);
    return d !== 0 ? d : a[0].localeCompare(b[0]);
  });
}

function GlossaryCard({ item, ctx, accent }) {
  return html`<div class="card glossary-card">
    <div class="card-actions">
      <${IconButton} name="edit" title="Edit" onClick=${() => ctx.edit(item)} />
      <${IconButton} name="trash" title="Delete" danger onClick=${() => ctx.remove(item)} />
    </div>
    <div class="card-head">
      <h3>${item.term}</h3>
      <${Badge} color=${accent}>${item.category}<//>
    </div>
    <p class="muted-text">${item.definition}</p>
    ${item.example &&
    html`<div class="glossary-example">
      <span class="glossary-example-label">Example</span>
      <p>${item.example}</p>
    </div>`}
  </div>`;
}

export function GlossaryTab({ accent }) {
  return html`<${CollectionTab}
    storeKey="glossary"
    accent=${accent}
    newLabel="Add term"
    modalTitle="term"
    seed=${SEED}
    searchKeys=${['term', 'definition', 'example', 'section']}
    fields=${[
      { name: 'term', label: 'Term', required: true, placeholder: 'e.g. API' },
      { name: 'definition', label: 'Your plain-English definition', type: 'textarea', required: true, rows: 4 },
      { name: 'example', label: 'Example use case', type: 'textarea', rows: 2, placeholder: 'A quick example that makes it click' },
      { name: 'category', label: 'Category', type: 'select', options: catOptions },
      { name: 'section', label: 'Section (groups related terms together)', placeholder: 'e.g. Context management' },
    ]}
    sortOptions=${[
      { value: 'az', label: 'A → Z', cmp: (a, b) => a.term.localeCompare(b.term) },
      { value: 'new', label: 'Newest added', cmp: (a, b) => (b._created || '').localeCompare(a._created || '') },
    ]}
    filters=${[{ key: 'category', label: 'Category', options: catOptions }]}
    emptyText="No terms yet."
    emptyHint="Add the first thing you learned today."
    renderItems=${({ items, ...ctx }) => html`<div class="glossary-sections">
      ${groupBySection(items).map(
        ([section, list]) => html`<section class="glossary-section" key=${section}>
          <h2 class="glossary-section-title">${section}</h2>
          <div class="cards-grid">
            ${list.map((it) => html`<${GlossaryCard} key=${it.id} item=${it} ctx=${ctx} accent=${accent} />`)}
          </div>
        </section>`
      )}
    </div>`}
  />`;
}
