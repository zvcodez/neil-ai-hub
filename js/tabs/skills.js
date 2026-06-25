import { html, fmtDate, today } from '../core.js';
import { Badge } from '../components.js';
import { CollectionTab } from '../collection.js';

const CATEGORIES = ['Programming', 'Tools', 'Soft Skills', 'AI/ML', 'Web', 'Other'];
const LEVELS = ['Beginner', 'Learning', 'Comfortable', 'Proficient'];
const catOptions = CATEGORIES.map((c) => ({ value: c, label: c }));
const levelOptions = LEVELS.map((l) => ({ value: l, label: l }));
const levelColor = { Beginner: '#ef4444', Learning: '#f59e0b', Comfortable: '#38bdf8', Proficient: '#10b981' };
const levelPct = { Beginner: 25, Learning: 50, Comfortable: 75, Proficient: 100 };

export function SkillsTab({ accent }) {
  return html`<${CollectionTab}
    storeKey="skills"
    accent=${accent}
    newLabel="Add skill"
    modalTitle="skill"
    searchKeys=${['name', 'notes']}
    fields=${[
      { name: 'name', label: 'Skill', required: true, placeholder: 'e.g. Python, Git, Prompt Engineering' },
      { name: 'category', label: 'Category', type: 'select', options: catOptions },
      { name: 'confidence', label: 'Confidence level', type: 'select', options: levelOptions },
      { name: 'notes', label: 'Where are you using it?', type: 'textarea' },
      { name: 'dateAdded', label: 'Date added', type: 'date', default: 'today' },
    ]}
    sortOptions=${[
      { value: 'level', label: 'Most confident', cmp: (a, b) => levelPct[b.confidence] - levelPct[a.confidence] },
      { value: 'az', label: 'A → Z', cmp: (a, b) => a.name.localeCompare(b.name) },
      { value: 'new', label: 'Newest', cmp: (a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '') },
    ]}
    filters=${[
      { key: 'category', label: 'Category', options: catOptions },
      { key: 'confidence', label: 'Confidence', options: levelOptions },
    ]}
    beforeSave=${(item, prev) => {
      const history = prev?.history ? [...prev.history] : [{ level: item.confidence, date: item.dateAdded || today() }];
      if (prev && prev.confidence !== item.confidence) {
        history.push({ level: item.confidence, date: today() });
      }
      return { ...item, history };
    }}
    emptyText="No skills tracked yet."
    emptyHint="Add a skill and rate your confidence — watch it grow over time."
    renderItems=${({ items, edit, remove }) => html`<div class="skills-grid">
      ${items.map((it) => {
        const color = levelColor[it.confidence];
        const pct = levelPct[it.confidence];
        const grew = it.history && it.history.length > 1;
        return html`<div class="card skill-card" key=${it.id} onClick=${() => edit(it)}>
          <div class="card-actions">
            <button class="icon-btn danger" title="Delete"
              onClick=${(e) => { e.stopPropagation(); remove(it); }}>×</button>
          </div>
          <div class="skill-top">
            <h3>${it.name}</h3>
            <${Badge}>${it.category}<//>
          </div>
          <div class="progress">
            <div class="progress-fill" style=${{ width: pct + '%', background: color }}></div>
          </div>
          <div class="skill-meta">
            <span style=${{ color }}>${it.confidence}</span>
            <span class="muted-text">since ${fmtDate(it.dateAdded)}</span>
          </div>
          ${grew && html`<div class="skill-history">
            Progression: ${it.history.map((h, i) => html`<span key=${i}>${h.level === it.confidence && i === it.history.length - 1 ? html`<strong>${h.level}</strong>` : h.level}${i < it.history.length - 1 ? ' → ' : ''}</span>`)}
          </div>`}
          ${it.notes && html`<p class="muted-text">${it.notes}</p>`}
        </div>`;
      })}
    </div>`}
  />`;
}
