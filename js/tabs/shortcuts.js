import { html, fmtDate } from '../core.js';
import { Badge, IconButton } from '../components.js';
import { CollectionTab } from '../collection.js';

const CONTEXTS = ['Claude Code', 'Mac', 'GitHub', 'Terminal', 'General'];
const ctxOptions = CONTEXTS.map((c) => ({ value: c, label: c }));

const SEED = [
  {
    id: 'seed-clear',
    shortcut: 'Clear context',
    command: '/clear',
    whatItDoes: 'Clears the current Claude Code conversation context to start fresh.',
    context: 'Claude Code',
    dateDiscovered: '2026-06-24',
    _created: '2026-06-24T00:00:00.000Z',
  },
];

export function ShortcutsTab({ accent }) {
  return html`<${CollectionTab}
    storeKey="shortcuts"
    accent=${accent}
    newLabel="Add shortcut"
    modalTitle="shortcut"
    seed=${SEED}
    searchKeys=${['shortcut', 'command', 'whatItDoes']}
    fields=${[
      { name: 'shortcut', label: 'Shortcut / command name', required: true, placeholder: 'e.g. Stage all changes' },
      { name: 'command', label: 'Full command or key combo', mono: true, required: true, placeholder: 'e.g. git add -A' },
      { name: 'whatItDoes', label: 'What it does', type: 'textarea', required: true },
      { name: 'context', label: 'Context', type: 'select', options: ctxOptions },
      { name: 'dateDiscovered', label: 'Date discovered', type: 'date', default: 'today' },
    ]}
    sortOptions=${[
      { value: 'az', label: 'A → Z', cmp: (a, b) => a.shortcut.localeCompare(b.shortcut) },
      { value: 'new', label: 'Newest', cmp: (a, b) => (b.dateDiscovered || '').localeCompare(a.dateDiscovered || '') },
    ]}
    filters=${[{ key: 'context', label: 'Context', options: ctxOptions }]}
    emptyText="No shortcuts yet."
    emptyHint="Save that command you keep forgetting."
    renderItems=${({ items, edit, remove }) => html`<div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>Shortcut</th><th>What it does</th><th>Context</th><th></th></tr>
        </thead>
        <tbody>
          ${items.map(
            (it) => html`<tr key=${it.id}>
              <td>
                <div class="cell-title">${it.shortcut}</div>
                <code class="mono">${it.command}</code>
              </td>
              <td class="muted-text">${it.whatItDoes}<div class="cell-sub">${fmtDate(it.dateDiscovered)}</div></td>
              <td><${Badge} color=${accent}>${it.context}<//></td>
              <td class="row-actions">
                <${IconButton} name="edit" title="Edit" onClick=${() => edit(it)} />
                <${IconButton} name="trash" title="Delete" danger onClick=${() => remove(it)} />
              </td>
            </tr>`
          )}
        </tbody>
      </table>
    </div>`}
  />`;
}
