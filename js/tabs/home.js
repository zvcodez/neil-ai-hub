// Home: the ambient-glass landing screen. Same content whether it's the first
// thing you see opening the app, or a tab you tap back to — a calm dashboard
// of "where things stand" plus one-tap jumps into the rest of the hub.
import { html, useMemo, useStore, relativeDate, externalLinkProps } from '../core.js';
import { Icon, Sparkline } from '../components.js';
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
// you're already on). Strict alphabetical — the live/building dot color
// carries status, order doesn't.
function useLiveApps(projects) {
  return useMemo(() => {
    const here = location.href.replace(/\/+$/, '');
    return projects
      .filter((p) => p.liveUrl && here !== p.liveUrl.replace(/\/+$/, ''))
      .map((p) => ({ id: p.id, name: shortName(p.name), url: p.liveUrl, live: p.stage === 'Live' }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);
}

function useQuickCounts(projects) {
  const [apps] = useStore('career-applications', []);
  const [ventures] = useStore('business-ventures', []);
  const [skills] = useStore('skills', []);
  const [timeline] = useStore('timeline', []);
  return useMemo(() => {
    const building = projects.filter((p) => p.stage === 'Building').length;
    const waiting = apps.filter((a) => !['To Apply', 'Did Not Apply', 'Offer', 'Rejected'].includes(a.status)).length;
    const growthCount = skills.length + timeline.length;
    return {
      projects: {
        value: projects.length,
        sub: projects.length ? `${building} building` : 'Nothing tracked yet',
      },
      career: {
        value: waiting,
        sub: apps.length ? 'in motion' : 'No applications yet',
      },
      business: {
        value: ventures.length,
        sub: ventures.length ? `venture${ventures.length === 1 ? '' : 's'}` : 'Start your first idea',
      },
      growth: {
        value: growthCount,
        sub: growthCount ? `${skills.length} skill${skills.length === 1 ? '' : 's'} · ${timeline.length} milestone${timeline.length === 1 ? '' : 's'}` : 'Start your journey',
      },
    };
  }, [projects, apps, ventures, skills, timeline]);
}

// Weekly journal-entry counts summed across every project's log, last 8
// weeks — same derivation projects.js uses per-project, just totalled — plus
// whichever project was touched most recently. Only real data; renders
// nothing if there's no history yet (no fake flat line off zero entries).
function useActivity(projects) {
  return useMemo(() => {
    const day = 86400000;
    const now = Date.now();
    const weeks = new Array(8).fill(0);
    let any = false;
    let last = null;
    projects.forEach((p) => {
      const log = Array.isArray(p.log) ? p.log : [];
      log.forEach((e) => {
        const t = new Date(e.ts).getTime();
        if (isNaN(t)) return;
        const weeksAgo = Math.floor((now - t) / (7 * day));
        if (weeksAgo >= 0 && weeksAgo < 8) { weeks[7 - weeksAgo] += 1; any = true; }
      });
      const lastTs = log[0]?.ts || p._stagedAt || p._created;
      if (lastTs && (!last || new Date(lastTs) > new Date(last.ts))) {
        last = { name: shortName(p.name), ts: lastTs };
      }
    });
    return { weeks: any ? weeks : null, last };
  }, [projects]);
}

export function HomeTab({ onNavigate, theme, setTheme }) {
  const [projects] = useStore('projects', []);
  const counts = useQuickCounts(projects);
  const apps = useLiveApps(projects);
  const activity = useActivity(projects);

  const quick = [
    { id: 'projects', label: 'Projects', ...counts.projects, icon: 'projects', color: 'var(--home-blue)' },
    { id: 'career', label: 'Career', ...counts.career, icon: 'career', color: 'var(--home-violet)' },
    { id: 'business', label: 'Business', ...counts.business, icon: 'business', color: 'var(--home-amber)' },
    { id: 'growth', label: 'Growth', ...counts.growth, icon: 'skills', color: 'var(--home-teal)' },
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

      <div class="home-stats-grid">
        ${quick.map(
          (q) => html`<button key=${q.id} class="home-stat-card" style=${{ '--qcolor': q.color }} onClick=${() => onNavigate(q.id)}>
            <div class="home-stat-top">
              <${Icon} name=${q.icon} size=${16} />
              <span class="home-stat-name">${q.label}</span>
              <span class="home-arrow">→</span>
            </div>
            <div class="stat-num">${q.value}</div>
            <div class="stat-lbl">${q.sub}</div>
          </button>`
        )}
      </div>

      ${activity.weeks &&
      html`<div class="home-activity-card">
        <p class="stat-lbl">Activity, last 8 weeks</p>
        <${Sparkline} data=${activity.weeks} />
        ${activity.last &&
        html`<p class="home-activity-sub">Last touched <strong>${activity.last.name}</strong> · ${relativeDate(activity.last.ts)}</p>`}
      </div>`}

      ${apps.length > 0 &&
      html`<div class="home-apps">
        <p class="home-apps-label">Neil’s Apps</p>
        <div class="home-apps-grid">
          ${apps.map(
            (a) => html`<a key=${a.id} class="home-app" href=${a.url} ...${externalLinkProps()}>
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
