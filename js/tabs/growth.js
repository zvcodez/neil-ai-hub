// Growth: Timeline, Glossary, Skills and Resources folded into one tab as
// subtabs (same pattern as career.js) — these four were the "learning journey"
// tabs and read better together than as four separate nav destinations.
import { html, useStore } from '../core.js';
import { TimelineTab } from './timeline.js';
import { GlossaryTab } from './glossary.js';
import { SkillsTab } from './skills.js';
import { ResourcesTab } from './resources.js';

const SUBTABS = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'skills', label: 'Skills' },
  { id: 'glossary', label: 'Glossary' },
  { id: 'resources', label: 'Resources' },
];

export function GrowthTab({ accent }) {
  const [sub, setSub] = useStore('growth-subtab', 'timeline');
  const current = SUBTABS.some((s) => s.id === sub) ? sub : 'timeline';
  return html`<div class="growth">
    <div class="subtabs">
      ${SUBTABS.map(
        (s) => html`<button key=${s.id} class=${`subtab ${s.id === current ? 'active' : ''}`}
          onClick=${() => setSub(s.id)}>${s.label}</button>`
      )}
    </div>
    <div class="subtab-body">
      ${current === 'timeline' && html`<${TimelineTab} accent=${accent} />`}
      ${current === 'skills' && html`<${SkillsTab} accent=${accent} />`}
      ${current === 'glossary' && html`<${GlossaryTab} accent=${accent} />`}
      ${current === 'resources' && html`<${ResourcesTab} accent=${accent} />`}
    </div>
  </div>`;
}
