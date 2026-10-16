# Proposal: files-browser-hears-the-page

## Summary

`CnFilesBrowser` re-reads its folder when the page or the Files app says files changed, and reads a host-declared row action, New-menu entry, bulk action or column label through the host's translation.

## Why

Zuiddrecht rehearsal R2 (15 October 2026), a dossiq case's Files tab:
- A file deleted through the Files app's delete action stayed listed until reload: the action finishes after its own call returned, so the re-read after it saw the old folder.
- A document filed from a dialog elsewhere on the page never appeared: those dialogs signal `cn:page:refresh`, which the object lists hear and the files browser did not.
- The row actions the manifest declares ("Document properties", "Versions") were English on a Dutch instance.

## What changes

- The browser subscribes to `cn:page:refresh` and `files:node:created|deleted|updated|moved`, and re-reads once per burst (300 ms debounce). It unsubscribes on unmount.
- Host action labels and declared column labels go through the injected `cnTranslate` (identity without a host).
