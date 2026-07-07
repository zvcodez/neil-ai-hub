-- ClaudeCodeOpener: handles claudecode:// and neilhub:// links from the hub.
--   claudecode:///Users/neil/Claude/foo            -> open Claude Code there
--   claudecode://~/Claude/foo?prompt=<urlencoded>  -> ...and seed an opening prompt
--   neilhub://open-tracker                         -> open the Excel tracker
--
-- Opens a NEW Terminal window in the folder and starts Claude Code. It avoids
-- Apple Events to Terminal (which a background app can't get permission for) by
-- writing a one-shot .command and opening it with `open -a Terminal`.

on open location this_URL
	if this_URL starts with "neilhub://" then
		my handleNeilHub(this_URL)
		return
	end if

	set thePath to my pathFromURL(this_URL)
	if thePath is "" then return
	set thePrompt to my promptFromURL(this_URL)

	-- Expand a leading ~ to the home folder.
	if thePath starts with "~" then
		set homePath to POSIX path of (path to home folder) -- ends with "/"
		set thePath to (text 1 thru -2 of homePath) & (text 2 thru -1 of thePath)
	end if

	set ts to (do shell script "date +%s")
	set tmpFile to "/tmp/claudecode-" & ts & ".command"
	set lf to (ASCII character 10)

	set runLine to "cd " & quoted form of thePath & " && exec claude"
	if thePrompt is not "" then
		-- Percent-decode the prompt into a temp file (avoids all shell escaping).
		set promptFile to "/tmp/claudecode-" & ts & ".prompt"
		do shell script "/usr/bin/perl -e 'my $s=$ARGV[0]; $s=~s/%([0-9A-Fa-f]{2})/chr(hex($1))/ge; print $s;' " & quoted form of thePrompt & " > " & quoted form of promptFile
		set runLine to runLine & " \"$(cat " & quoted form of promptFile & ")\""
	end if

	set scriptText to "#!/bin/zsh" & lf & ¬
		"export PATH=\"$HOME/.local/bin:$PATH\"" & lf & ¬
		runLine & lf

	set fh to open for access (POSIX file tmpFile) with write permission
	set eof of fh to 0
	write scriptText to fh
	close access fh

	do shell script "chmod +x " & quoted form of tmpFile
	do shell script "open -a Terminal " & quoted form of tmpFile
end open location

-- Handle neilhub://<action> links. Only "open-tracker" exists today; reveals
-- ~/Downloads/Neil_Job_Tracker.xlsx selected in Finder (not "open" with the
-- default app — this Mac has no Excel/Numbers installed, so a plain open
-- would silently fail with no feedback; Finder reveal always works, and
-- spacebar Quick Look previews an .xlsx with no app needed).
on handleNeilHub(theURL)
	set theAction to text 11 thru -1 of theURL -- strip "neilhub://"
	if theAction contains "?" then
		set AppleScript's text item delimiters to "?"
		set theAction to text item 1 of theAction
		set AppleScript's text item delimiters to ""
	end if
	if theAction is "open-tracker" then
		set homePath to POSIX path of (path to home folder) -- ends with "/"
		set trackerPath to homePath & "Downloads/Neil_Job_Tracker.xlsx"
		do shell script "open -R " & quoted form of trackerPath
	end if
end handleNeilHub

-- Strip the scheme + any query string; percent-decode spaces.
on pathFromURL(theURL)
	set p to theURL
	if p starts with "claudecode://" then set p to text 14 thru -1 of p
	if p contains "?" then
		set AppleScript's text item delimiters to "?"
		set p to text item 1 of p
		set AppleScript's text item delimiters to ""
	end if
	set p to my replaceText(p, "%20", " ")
	return p
end pathFromURL

-- Pull the still-encoded value of the ?prompt= query param (or "").
on promptFromURL(theURL)
	if theURL does not contain "?" then return ""
	set AppleScript's text item delimiters to "?"
	set q to text item 2 of theURL
	set AppleScript's text item delimiters to "&"
	set params to text items of q
	set AppleScript's text item delimiters to ""
	repeat with prm in params
		set prm to prm as text
		if prm starts with "prompt=" then return text 8 thru -1 of prm
	end repeat
	return ""
end promptFromURL

on replaceText(theText, search, replacement)
	set oldDelims to AppleScript's text item delimiters
	set AppleScript's text item delimiters to search
	set parts to text items of theText
	set AppleScript's text item delimiters to replacement
	set out to parts as text
	set AppleScript's text item delimiters to oldDelims
	return out
end replaceText
