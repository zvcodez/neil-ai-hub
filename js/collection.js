// Generic CRUD collection tab: search, sort, filter, add/edit/delete + modal form.
import { html, useState, useMemo, useStore, uid, matchesQuery } from './core.js';
import {
  Button, SearchBox, Segmented, Modal, Form, EmptyState, IconButton, useConfirm,
} from './components.js';

export function CollectionTab({
  storeKey,
  accent,
  newLabel = 'Add',
  modalTitle = 'New entry',
  fields,
  seed = [],
  searchKeys = [],
  sortOptions = [],
  filters = [],
  renderItems,
  renderCard,
  beforeSave,
  emptyText = 'Nothing here yet.',
  emptyHint,
  toolbarExtra,
}) {
  const [items, setItems] = useStore(storeKey, seed);
  const [query, setQuery] = useState('');
  const [sortValue, setSortValue] = useState(sortOptions[0]?.value);
  const [filterValues, setFilterValues] = useState(() =>
    Object.fromEntries(filters.map((f) => [f.key, 'all']))
  );
  const [modal, setModal] = useState(null); // { editing } | { editing: null }
  const confirm = useConfirm();

  const save = (values) => {
    const editing = modal.editing;
    let next;
    if (editing) {
      next = beforeSave ? beforeSave({ ...editing, ...values }, editing) : { ...editing, ...values };
      setItems(items.map((it) => (it.id === editing.id ? next : it)));
    } else {
      next = { id: uid(), _created: new Date().toISOString(), ...values };
      if (beforeSave) next = beforeSave(next, null);
      setItems([next, ...items]);
    }
    setModal(null);
  };

  const remove = (item) =>
    confirm('Delete this entry? This cannot be undone.', () =>
      setItems(items.filter((it) => it.id !== item.id))
    );

  const update = (id, patch) =>
    setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const visible = useMemo(() => {
    let list = items.filter((it) => matchesQuery(query, ...searchKeys.map((k) => it[k])));
    for (const f of filters) {
      const v = filterValues[f.key];
      if (v && v !== 'all') list = list.filter((it) => it[f.key] === v);
    }
    const sort = sortOptions.find((s) => s.value === sortValue);
    if (sort?.cmp) list = [...list].sort(sort.cmp);
    return list;
  }, [items, query, filterValues, sortValue]);

  const ctx = { edit: (item) => setModal({ editing: item }), remove, update };

  return html`<div class="collection" style=${{ '--accent': accent }}>
    <div class="toolbar">
      ${searchKeys.length > 0 &&
      html`<${SearchBox} value=${query} onChange=${setQuery} placeholder=${`Search ${storeKey}...`} />`}
      ${sortOptions.length > 0 &&
      html`<label class="sort">
        Sort
        <select value=${sortValue} onChange=${(e) => setSortValue(e.target.value)}>
          ${sortOptions.map((s) => html`<option key=${s.value} value=${s.value}>${s.label}</option>`)}
        </select>
      </label>`}
      <div class="toolbar-spacer"></div>
      ${toolbarExtra}
      <${Button} variant="primary" icon="plus" onClick=${() => setModal({ editing: null })}>${newLabel}<//>
    </div>

    ${filters.length > 0 &&
    html`<div class="filters">
      ${filters.map(
        (f) => html`<div class="filter-group" key=${f.key}>
          <span class="filter-label">${f.label}</span>
          <${Segmented}
            options=${[{ value: 'all', label: f.allLabel || 'All' }, ...f.options]}
            value=${filterValues[f.key]}
            onChange=${(v) => setFilterValues((cur) => ({ ...cur, [f.key]: v }))}
          />
        </div>`
      )}
    </div>`}

    ${visible.length === 0
      ? html`<${EmptyState} text=${items.length === 0 ? emptyText : 'No matches for your filters.'} hint=${items.length === 0 ? emptyHint : undefined} />`
      : renderItems
      ? renderItems({ items: visible, ...ctx })
      : html`<div class="cards-grid">
          ${visible.map((it) => html`<${CardShell} key=${it.id} item=${it} ctx=${ctx} renderCard=${renderCard} />`)}
        </div>`}

    ${modal &&
    html`<${Modal}
      title=${modal.editing ? `Edit ${modalTitle}` : modalTitle}
      accent=${accent}
      onClose=${() => setModal(null)}
    >
      <${Form} fields=${fields} initial=${modal.editing} onSubmit=${save} onCancel=${() => setModal(null)} />
    <//>`}
  </div>`;
}

// Default card wrapper exposing edit/delete actions in the corner.
function CardShell({ item, ctx, renderCard }) {
  return html`<div class="card">
    <div class="card-actions">
      <${IconButton} name="edit" title="Edit" onClick=${() => ctx.edit(item)} />
      <${IconButton} name="trash" title="Delete" danger onClick=${() => ctx.remove(item)} />
    </div>
    ${renderCard(item, ctx)}
  </div>`;
}
