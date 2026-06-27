#!/bin/zsh
# Builds ClaudeCodeOpener.app from launcher.applescript and registers the
# claudecode:// URL scheme so the hub's "Open in Claude Code" buttons work.
# Uses only built-in macOS tools (osacompile, PlistBuddy, lsregister) — no
# Node/Homebrew. Re-run this any time (new Mac, app deleted, script changed).
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HOME/Applications/ClaudeCodeOpener.app"
PB=/usr/libexec/PlistBuddy
LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

mkdir -p "$HOME/Applications"
rm -rf "$APP"
osacompile -o "$APP" "$HERE/launcher.applescript"

PLIST="$APP/Contents/Info.plist"
$PB -c "Add :CFBundleURLTypes array" "$PLIST"
$PB -c "Add :CFBundleURLTypes:0 dict" "$PLIST"
$PB -c "Add :CFBundleURLTypes:0:CFBundleURLName string com.neil.claudecode" "$PLIST"
$PB -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$PLIST"
$PB -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string claudecode" "$PLIST"
$PB -c "Add :LSUIElement bool true" "$PLIST"
$PB -c "Set :CFBundleIdentifier com.neil.claudecodeopener" "$PLIST" 2>/dev/null \
  || $PB -c "Add :CFBundleIdentifier string com.neil.claudecodeopener" "$PLIST"

"$LSREGISTER" -f "$APP"
echo "✅ Installed: $APP"
echo "   Click an 'Open in Claude Code' button in the hub and choose 'Always allow' the first time."
