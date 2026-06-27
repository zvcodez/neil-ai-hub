-- ClaudeCodeOpener: handles claudecode:// links from the Neil AI Hub.
-- A link like  claudecode:///Users/neilpatel/Claude/neil-portfolio
-- opens a NEW Terminal window in that folder and starts Claude Code.
--
-- It deliberately avoids sending Apple Events to Terminal (which would need
-- Automation permission a background app can't easily prompt for). Instead it
-- writes a one-shot .command file and opens it with `open -a Terminal`, which
-- needs no special permission and always spawns a fresh window.

on open location this_URL
	set thePath to my pathFromURL(this_URL)
	if thePath is "" then return

	-- Expand a leading ~ to the home folder.
	if thePath starts with "~" then
		set homePath to POSIX path of (path to home folder) -- ends with "/"
		set thePath to (text 1 thru -2 of homePath) & (text 2 thru -1 of thePath)
	end if

	-- Build a throwaway launch script for this project.
	set tmpFile to "/tmp/claudecode-" & (do shell script "date +%s") & ".command"
	set lf to (ASCII character 10)
	set scriptText to "#!/bin/zsh" & lf & ¬
		"export PATH=\"$HOME/.local/bin:$PATH\"" & lf & ¬
		"cd " & quoted form of thePath & " && exec claude" & lf

	set fh to open for access (POSIX file tmpFile) with write permission
	set eof of fh to 0
	write scriptText to fh
	close access fh

	do shell script "chmod +x " & quoted form of tmpFile
	do shell script "open -a Terminal " & quoted form of tmpFile
end open location

-- Strip the scheme and percent-decode spaces (%20).
on pathFromURL(theURL)
	set p to theURL
	if p starts with "claudecode://" then set p to text 14 thru -1 of p
	set p to my replaceText(p, "%20", " ")
	return p
end pathFromURL

on replaceText(theText, search, replacement)
	set oldDelims to AppleScript's text item delimiters
	set AppleScript's text item delimiters to search
	set parts to text items of theText
	set AppleScript's text item delimiters to replacement
	set out to parts as text
	set AppleScript's text item delimiters to oldDelims
	return out
end replaceText
