-- ClaudeCodeOpener: handles claudecode:// links from the Neil AI Hub.
-- A link like  claudecode:///Users/neilpatel/Claude/neil-portfolio
-- opens Terminal in that folder and starts Claude Code.

on open location this_URL
	set thePath to my pathFromURL(this_URL)
	if thePath is "" then return

	-- Expand a leading ~ to the home folder.
	if thePath starts with "~" then
		set homePath to POSIX path of (path to home folder) -- ends with "/"
		set thePath to (text 1 thru -2 of homePath) & (text 2 thru -1 of thePath)
	end if

	set cmd to "export PATH=\"$HOME/.local/bin:$PATH\"; cd " & quoted form of thePath & " && claude"
	tell application "Terminal"
		activate
		do script cmd
	end tell
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
