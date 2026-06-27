# ClaudeCodeOpener — the hub's "Open in Claude Code" launcher

The Projects tab has an **Open in Claude Code** button on each card. A web page
can't open a terminal by itself, so this tiny local app does it: it registers a
`claudecode://` URL scheme on your Mac. Clicking the button hands the project's
folder path to this app, which opens Terminal in that folder and runs `claude`.

It's built with only built-in macOS tools — no Node, no Homebrew.

## Install / reinstall (one time per Mac)

```sh
./launcher/install.sh
```

That builds `~/Applications/ClaudeCodeOpener.app` and registers the scheme. The
**first** time you click a launch button, the browser asks "Open in
ClaudeCodeOpener?" — check **Always allow** and you're set forever.

## How a card maps to a command

A card with folder `~/Claude/neil-portfolio` produces the link
`claudecode://~/Claude/neil-portfolio`, and the app runs the equivalent of:

```sh
export PATH="$HOME/.local/bin:$PATH"   # so `claude` is found
cd ~/Claude/neil-portfolio && claude
```

(`~` is expanded, and spaces in paths are handled.)

## Notes / limits

- **This Mac only.** The launcher lives on your machine, so the button is a no-op
  on your phone or another computer. Everything else on the card (Chat, Repo,
  Live links) still works everywhere.
- Want **iTerm** instead of Terminal? Edit `launcher.applescript`
  (`tell application "Terminal"` → `"iTerm"`) and re-run `install.sh`.
- If a button does nothing, re-run `install.sh` and make sure the folder path on
  the card actually exists.
