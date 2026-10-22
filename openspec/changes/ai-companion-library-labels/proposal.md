# Proposal: ai-companion-library-labels

## Why

Hermiq mounts the AI companion on every Nextcloud page. Outside a CnAppRoot no host provides `cnTranslate`, so the
companion's labels fell back to the text as written: the floating button read "Open AI chat" on the Dq settings boards,
which draw "AI-chat openen".

## What changes

CnAiCompanion provides `cnTranslate` to its button and panel: the host's translate when it translates a label, else the
library's own catalogue, which it registers once for the page.
