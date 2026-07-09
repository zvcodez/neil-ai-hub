// App shell: navigation, theme, routing.
import { html, ReactDOM, useState, useEffect, loadStore, saveStore } from './core.js';
import { Icon } from './components.js';
import { SyncButton, initSync } from './sync.js';

import { HomeTab } from './tabs/home.js';
import { ProjectsTab } from './tabs/projects.js';
import { CareerTab } from './tabs/career.js';
import { BusinessTab } from './tabs/business.js';
import { GrowthTab } from './tabs/growth.js';

// Canonical order — used for the sidebar (desktop) and as the source of truth
// for every tab's identity/accent/icon.
const TABS = [
  { id: 'home', label: 'Home', icon: 'home', accent: '#4f7cff', component: HomeTab },
  { id: 'projects', label: 'Projects', icon: 'projects', accent: '#4f7cff', component: ProjectsTab },
  { id: 'career', label: 'Career', icon: 'career', accent: '#9b6bff', component: CareerTab },
  { id: 'business', label: 'Business', icon: 'business', accent: '#f7b955', component: BusinessTab },
  { id: 'growth', label: 'Growth', icon: 'skills', accent: '#14b8a6', component: GrowthTab },
];

// Mobile bottom nav gets its own order: Home sits center, Projects/Career to
// its left, Business/Growth to its right (per Neil's layout — the sidebar
// doesn't have a "center", so it just uses the canonical order above).
const BOTTOM_ORDER = ['projects', 'career', 'home', 'business', 'growth'];
const BOTTOM_TABS = BOTTOM_ORDER.map((id) => TABS.find((t) => t.id === id));

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
    const saved = loadStore('activeTab', 'home');
    return TABS.some((t) => t.id === saved) ? saved : 'home';
  });
  const [theme, setTheme] = useTheme();
  useEffect(() => saveStore('activeTab', active), [active]);

  const tab = TABS.find((t) => t.id === active) || TABS[0];
  const Active = tab.component;
  const isHome = tab.id === 'home';

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
      ${!isHome && html`<header class="content-head">
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
      </header>`}
      <div class=${`content-body ${isHome ? 'home-active' : ''}`}>
        <${Active} accent=${tab.accent} onNavigate=${setActive} theme=${theme} setTheme=${setTheme} />
      </div>
    </main>

    <nav class="bottom-nav">
      ${BOTTOM_TABS.map(
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
