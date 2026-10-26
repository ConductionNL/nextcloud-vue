---
kind: code
---

# Proposal: library-string-host-fallback

## Summary

The AI button's name went through the host app's `cnTranslate`; an app whose catalogue lacks "Open AI chat" answered the English back, so dossiq in Dutch read "Open AI chat" where every board reads "AI-chat openen" (r31: missing/extra on every Dq board). `translateLibraryString()` uses the host's translation when it has one and the library's otherwise; the floating button uses it.

## Scope

- `src/utils/libraryTranslate.js`, `CnAiFloatingButton.vue`, a jest test.
