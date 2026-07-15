// Home: the ambient-glass landing screen. Same content whether it's the first
// thing you see opening the app, or a tab you tap back to — a calm dashboard
// of "where things stand" plus one-tap jumps into the rest of the hub.
import { html, useMemo, loadStore } from '../core.js';
import { Icon } from '../components.js';
import { SyncButton } from '../sync.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Up late, Neil?';
  if (h < 12) return 'Ready to build, Neil?';
  if (h < 17) return 'Back at it, Neil?';
  if (h < 21) return 'Evening, Neil — still building?';
  return 'Winding down, Neil?';
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

// "Jot — all-in-one capture inbox" → "Jot": chips only have room for the
// app's actual name, not the tagline half of the project title.
function shortName(name) {
  return String(name || '').split(/\s+[—–(]/)[0].trim() || name;
}

// Every project with a live URL, except the hub itself (a link to the page
// you're already on). Live apps first, then building, alphabetical within.
function useLiveApps() {
  return useMemo(() => {
    const here = location.href.replace(/\/+$/, '');
    return loadStore('projects', [])
      .filter((p) => p.liveUrl && here !== p.liveUrl.replace(/\/+$/, ''))
      .map((p) => ({ id: p.id, name: shortName(p.name), url: p.liveUrl, live: p.stage === 'Live' }))
      .sort((a, b) => (a.live === b.live ? a.name.localeCompare(b.name) : a.live ? -1 : 1));
  }, []);
}

// Live counts read once on mount — enough to make the landing screen feel
// like it's watching the hub, without wiring up full reactive stores here.
function useQuickCounts() {
  return useMemo(() => {
    const projects = loadStore('projects', []);
    const building = projects.filter((p) => p.stage === 'Building').length;
    const apps = loadStore('career-applications', []);
    const waiting = apps.filter((a) => !['To Apply', 'Did Not Apply', 'Offer', 'Rejected'].includes(a.status)).length;
    const ventures = loadStore('business-ventures', []);
    const skills = loadStore('skills', []);
    const timeline = loadStore('timeline', []);
    const growthCount = skills.length + timeline.length;
    return {
      projects: projects.length ? `${projects.length} tracked · ${building} building` : 'Nothing tracked yet',
      career: apps.length ? `${waiting} in motion` : 'No applications yet',
      business: ventures.length ? `${ventures.length} venture${ventures.length === 1 ? '' : 's'}` : 'Start your first idea',
      growth: growthCount ? `${skills.length} skill${skills.length === 1 ? '' : 's'} · ${timeline.length} milestone${timeline.length === 1 ? '' : 's'}` : 'Start your journey',
    };
  }, []);
}

export function HomeTab({ onNavigate, theme, setTheme }) {
  const counts = useQuickCounts();
  const apps = useLiveApps();

  const quick = [
    { id: 'projects', label: 'Projects', sub: counts.projects, icon: 'projects', color: 'var(--home-blue)' },
    { id: 'career', label: 'Career', sub: counts.career, icon: 'career', color: 'var(--home-violet)' },
    { id: 'business', label: 'Business', sub: counts.business, icon: 'business', color: 'var(--home-amber)' },
    { id: 'growth', label: 'Growth', sub: counts.growth, icon: 'skills', color: 'var(--home-teal)' },
  ];

  return html`<div class="home">
    <div class="home-blob b1"></div>
    <div class="home-blob b2"></div>
    <div class="home-blob b3"></div>

    <div class="home-body">
      <div>
        <p class="home-greet-eyebrow">${todayLabel()}</p>
        <h1 class="home-greet-h">${greeting()}</h1>
      </div>
      <p class="home-greet-sub">Jump into a section, or use the bar below.</p>

      <div class="home-quick">
        ${quick.map(
          (q) => html`<button key=${q.id} style=${{ '--qcolor': q.color }} onClick=${() => onNavigate(q.id)}>
            <${Icon} name=${q.icon} size=${20} />
            <span class="home-quick-label">
              <span>${q.label}</span>
              <small>${q.sub}</small>
            </span>
            <span class="home-arrow">→</span>
          </button>`
        )}
      </div>

      ${apps.length > 0 &&
      html`<div class="home-apps">
        <p class="home-apps-label">Neil’s Apps</p>
        <div class="home-apps-grid">
          ${apps.map(
            (a) => html`<a key=${a.id} class="home-app" href=${a.url} target="_blank" rel="noopener">
              <span class=${`home-app-dot ${a.live ? 'is-live' : ''}`}></span>
              <span class="home-app-name">${a.name}</span>
              <span class="home-arrow">↗</span>
            </a>`
          )}
        </div>
      </div>`}
    </div>

    <div class="home-foot">
      <${SyncButton} compact=${true} />
      <button class="theme-toggle compact" onClick=${() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title=${`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        <${Icon} name=${theme === 'dark' ? 'sun' : 'moon'} size=${18} />
      </button>
    </div>
  </div>`;
}
