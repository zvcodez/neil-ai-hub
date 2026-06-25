import { html, cx } from '../core.js';
import { Badge, IconButton } from '../components.js';
import { CollectionTab } from '../collection.js';

const PRIORITIES = ['Quick Win', 'Medium', 'Ambitious'];
const CATEGORIES = ['New Project', 'Feature', 'Improvement', 'Learning', 'Other'];
const prioOptions = PRIORITIES.map((p) => ({ value: p, label: p }));
const catOptions = CATEGORIES.map((c) => ({ value: c, label: c }));
const prioColor = { 'Quick Win': '#10b981', Medium: '#f59e0b', Ambitious: '#ef4444' };
const prioRank = { 'Quick Win': 0, Medium: 1, Ambitious: 2 };

export function IdeasTab({ accent }) {
  return html`<${CollectionTab}
    storeKey="ideas"
    accent=${accent}
    newLabel="Add idea"
    modalTitle="idea"
    searchKeys=${['title', 'description']}
    fields=${[
      { name: 'title', label: 'Title', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'priority', label: 'Priority', type: 'select', options: prioOptions },
      { name: 'category', label: 'Category', type: 'select', options: catOptions },
      { name: 'dateCreated', label: 'Date created', type: 'date', default: 'today' },
    ]}
    sortOptions=${[
      { value: 'prio', label: 'By priority', cmp: (a, b) => prioRank[a.priority] - prioRank[b.priority] },
      { value: 'new', label: 'Newest', cmp: (a, b) => (b.dateCreated || '').localeCompare(a.dateCreated || '') },
      { value: 'category', label: 'By category', cmp: (a, b) => a.category.localeCompare(b.category) },
    ]}
    filters=${[
      { key: 'status', label: 'Status', allLabel: 'All', options: [
        { value: 'Active', label: 'Active' }, { value: 'Completed', label: 'Completed' },
      ] },
      { key: 'priority', label: 'Priority', options: prioOptions },
      { key: 'category', label: 'Category', options: catOptions },
    ]}
    beforeSave=${(item) => ({ status: 'Active', ...item })}
    emptyText="No ideas captured yet."
    emptyHint="Dump that random thought before it escapes."
    renderItems=${({ items, edit, remove, update }) => html`<div class="cards-grid">
      ${items.map(
        (it) => html`<div class=${cx('card', 'idea-card', it.status === 'Completed' && 'done')} key=${it.id}>
          <div class="card-actions">
            <${IconButton} name="check" title=${it.status === 'Completed' ? 'Mark active' : 'Mark completed'}
              onClick=${() => update(it.id, { status: it.status === 'Completed' ? 'Active' : 'Completed' })} />
            <${IconButton} name="edit" title="Edit" onClick=${() => edit(it)} />
            <${IconButton} name="trash" title="Delete" danger onClick=${() => remove(it)} />
          </div>
          <div class="card-head">
            <h3>${it.title}</h3>
          </div>
          <div class="badge-row">
            <${Badge} color=${prioColor[it.priority]}>${it.priority}<//>
            <${Badge}>${it.category}<//>
            ${it.status === 'Completed' && html`<${Badge} color="#10b981">Completed<//>`}
          </div>
          ${it.description && html`<p class="muted-text">${it.description}</p>`}
        </div>`
      )}
    </div>`}
  />`;
}
