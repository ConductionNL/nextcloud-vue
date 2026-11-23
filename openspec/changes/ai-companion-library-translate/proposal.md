# The AI companion speaks the user's language without a host translator

## Why

hermiq mounts the AI chat companion on every Nextcloud page outside its own,
without CnAppRoot, and so without a `cnTranslate`. On a page where that mount
wins the page's single companion slot, the button read "Open AI chat" in
English, although the library's catalogue holds "AI-chat openen". COMPDIFF r24
recorded this on seven Dutch dossiq boards (DqInstellingen,
DqVthInstellingen, DqBeheerinstellingen and others) as a missing "AI-chat
openen" button plus an extra "Open AI chat" one.

## What changes

- The companion's parts default their injected `cnTranslate` to a new helper,
  `libraryTranslate`. It uses the library's own strings, and registers the
  library catalogue first if the page never did.
- A host translator still wins when one is provided.
