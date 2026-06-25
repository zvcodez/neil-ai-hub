# Neil AI Hub

A personal PWA "mission control" dashboard for tracking an AI learning journey —
projects, timeline, glossary, shortcuts, resources, ideas, career search, and
skills. Mac-first, fully responsive, dark mode by default.

Built with **no build step**: real React 18 + [htm](https://github.com/developit/htm)
loaded as vendored ES modules. No Node, npm, or bundler required — it's just
static files.

## Run it locally

You only need a static file server (the app uses ES modules, so opening
`index.html` directly via `file://` won't work — it must be served over HTTP).

```bash
cd neil-ai-hub
./serve.sh            # → http://localhost:5173
# or:
python3 -m http.server 5173
```

Then open <http://localhost:5173>.

## The 8 tabs

| Tab | What it does |
| --- | --- |
| **Projects** | Auto-fetches your GitHub repos (`zvcodez`). Add a live URL, status (In Progress / Live / Paused) and personal notes per repo. "Add launch to Timeline" pushes a launch entry. |
| **Timeline** | Vertical, color-coded journey graph. Add milestones, learnings, achievements. |
| **Glossary** | Searchable AI/tech terms with your own plain-English definitions. |
| **Shortcuts** | Table of terminal commands, key combos and Claude Code tricks. |
| **Resources** | Saved links with star ratings and notes. |
| **Ideas** | Backlog of project/feature ideas with priority + complete toggle. |
| **Career** | 5 sub-tabs: Job Roles, Companies, Applications (drag-and-drop kanban), Networking, Interview Prep (with study mode). |
| **Skills** | Confidence progress bars that track how your skills grow over time. |

## Data storage

By default, all entries are stored in the browser's **localStorage** (keys
prefixed `nah:`) — instant, offline, on your device.

### Cross-device sync (optional)

Turn on sync (the **cloud button** in the sidebar) to store your data as JSON
files in the **`zvcodez/neil-ai-hub`** repo under `data/`. Then your phone and
your laptop read/write the same files, so edits flow between devices.

- **Keep the repo private** — your notes/contacts live in it.
- Create a **fine-grained personal access token** (github.com → Settings →
  Developer settings → fine-grained tokens) scoped to **only the `neil-ai-hub`
  repo** with **Repository permissions → Contents: Read and write**. Paste it
  into the sync dialog and click **Enable sync**. The token is stored only in
  your browser.
- How it works: localStorage stays the live cache; the app **pushes** changes to
  the repo (debounced, one small commit per change) and **pulls** on focus / every
  60s. Conflicts resolve last-write-wins per file (`js/sync.js`).

## GitHub integration

The Projects tab calls the public GitHub API for `zvcodez` — no token needed.
For private repos or higher rate limits, click **Token** and paste a fine-grained
personal access token (read-only repo access). It's stored only in your browser.

## Deploy to GitHub Pages

This is already a static site, so deployment is just pushing the files.

```bash
cd neil-ai-hub
git init
git add .
git commit -m "Neil AI Hub"
git branch -M main
git remote add origin https://github.com/zvcodez/neil-ai-hub.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Build from branch → `main` / root**.
Your site goes live at `https://zvcodez.github.io/neil-ai-hub/`.

## Project structure

```
neil-ai-hub/
├─ index.html          # shell; loads vendored React + htm, then js/main.js
├─ manifest.json       # PWA manifest (NAH icon)
├─ sw.js               # service worker (offline app shell)
├─ serve.sh            # local dev server
├─ css/styles.css      # themes, layout, all components
├─ vendor/             # React, ReactDOM, htm (UMD) — vendored, no CDN at runtime
├─ icons/              # NAH app icons (svg + 192/512 png)
└─ js/
   ├─ core.js          # React/htm bindings, localStorage hooks, helpers
   ├─ components.js    # Icon, Modal, Form builder, Badge, controls
   ├─ collection.js    # generic CRUD tab (search/sort/filter/modal form)
   ├─ github.js        # GitHub API client
   ├─ main.js          # app shell: nav, theme, routing
   └─ tabs/            # one module per tab
```
