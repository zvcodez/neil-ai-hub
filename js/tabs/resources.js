import { html } from '../core.js';
import { Badge, StarRating, Icon } from '../components.js';
import { CollectionTab } from '../collection.js';

const CATEGORIES = ['Articles', 'Videos', 'Tools', 'Books', 'Documentation', 'Communities', 'Other'];
const catOptions = CATEGORIES.map((c) => ({ value: c, label: c }));

export function ResourcesTab({ accent }) {
  return html`<${CollectionTab}
    storeKey="resources"
    accent=${accent}
    newLabel="Add resource"
    modalTitle="resource"
    searchKeys=${['title', 'note']}
    fields=${[
      { name: 'title', label: 'Title', required: true },
      { name: 'url', label: 'URL', type: 'url', required: true, placeholder: 'https://...' },
      { name: 'category', label: 'Category', type: 'select', options: catOptions },
      { name: 'rating', label: 'Your rating', type: 'stars' },
      { name: 'note', label: 'Why is it useful?', type: 'textarea' },
    ]}
    sortOptions=${[
      { value: 'rating', label: 'Highest rated', cmp: (a, b) => (b.rating || 0) - (a.rating || 0) },
      { value: 'category', label: 'By category', cmp: (a, b) => a.category.localeCompare(b.category) },
      { value: 'az', label: 'A → Z', cmp: (a, b) => a.title.localeCompare(b.title) },
    ]}
    filters=${[{ key: 'category', label: 'Category', options: catOptions }]}
    emptyText="No resources saved yet."
    emptyHint="Bookmark a channel, article, or tool you love."
    renderCard=${(it) => html`<div class="resource-card">
      <div class="card-head">
        <a class="card-link" href=${it.url} target="_blank" rel="noreferrer">
          ${it.title}<${Icon} name="external" size=${14} />
        </a>
        <${Badge} color=${accent}>${it.category}<//>
      </div>
      <${StarRating} value=${it.rating || 0} readOnly=${true} />
      ${it.note && html`<p class="muted-text">${it.note}</p>`}
    </div>`}
  />`;
}
