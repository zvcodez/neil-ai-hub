// App shell: navigation, theme, routing.
import { html, ReactDOM, useState, useEffect, loadStore, saveStore } from './core.js';
import { Icon } from './components.js';
import { SyncButton, initSync } from './sync.js';

import { ProjectsTab } from './tabs/projects.js';
import { TimelineTab } from './tabs/timeline.js';
import { GlossaryTab } from './tabs/glossary.js';
import { ResourcesTab } from './tabs/resources.js';
import { CareerTab } from './tabs/career.js';
import { SkillsTab } from './tabs/skills.js';

const TABS = [
  { id: 'projects', label: 'Projects', icon: 'projects', accent: '#2563eb', component: ProjectsTab },
  { id: 'timeline', label: 'Timeline', icon: 'timeline', accent: '#f59e0b', component: TimelineTab },
  { id: 'glossary', label: 'Glossary', icon: 'glossary', accent: '#a855f7', component: GlossaryTab },
  { id: 'resources', label: 'Resources', icon: 'resources', accent: '#10b981', component: ResourcesTab },
  { id: 'career', label: 'Career', icon: 'career', accent: '#2563eb', component: CareerTab },
  { id: 'skills', label: 'Skills', icon: 'skills', accent: '#14b8a6', component: SkillsTab },
];

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = loadStore('theme', null);
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveStore('theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

function App() {
  const [active, setActive] = useState(() => {
    const saved = loadStore('activeTab', 'projects');
    return TABS.some((t) => t.id === saved) ? saved : 'projects';
  });
  const [theme, setTheme] = useTheme();
  useEffect(() => saveStore('activeTab', active), [active]);

  const tab = TABS.find((t) => t.id === active) || TABS[0];
  const Active = tab.component;

  return html`<div class="app" style=${{ '--accent': tab.accent }}>
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">NP</span>
        <div class="brand-text">
          <strong>Neil AI Hub</strong>
          <small>Mission control</small>
        </div>
      </div>
      <nav class="nav">
        ${TABS.map(
          (t) => html`<button
            key=${t.id}
            class=${`nav-item ${t.id === active ? 'active' : ''}`}
            style=${{ '--accent': t.accent }}
            onClick=${() => setActive(t.id)}
          >
            <${Icon} name=${t.icon} size=${19} />
            <span>${t.label}</span>
          </button>`
        )}
      </nav>
      <div class="sidebar-foot">
        <${SyncButton} />
        <button class="theme-toggle" onClick=${() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title=${`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          <${Icon} name=${theme === 'dark' ? 'sun' : 'moon'} size=${17} />
          <span>${theme === 'dark' ? 'Light' : 'Dark'} mode</span>
        </button>
      </div>
    </aside>

    <main class="content">
      <header class="content-head">
        <div class="head-title" style=${{ '--accent': tab.accent }}>
          <${Icon} name=${tab.icon} size=${22} />
          <h1>${tab.label}</h1>
        </div>
        <div class="head-actions">
          <${SyncButton} compact=${true} />
          <button class="theme-toggle compact" onClick=${() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title=${`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            <${Icon} name=${theme === 'dark' ? 'sun' : 'moon'} size=${18} />
          </button>
        </div>
      </header>
      <div class="content-body">
        <${Active} accent=${tab.accent} />
      </div>
    </main>

    <nav class="bottom-nav">
      ${TABS.map(
        (t) => html`<button
          key=${t.id}
          class=${`bottom-item ${t.id === active ? 'active' : ''}`}
          style=${{ '--accent': t.accent }}
          onClick=${() => setActive(t.id)}
        >
          <${Icon} name=${t.icon} size=${20} />
          <span>${t.label}</span>
        </button>`
      )}
    </nav>
  </div>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);

// Start the cross-device sync engine (no-op until the user enables it).
initSync();

// Register service worker for offline/PWA support.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW failed', e));
  });
}
