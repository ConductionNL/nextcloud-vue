---
kind: code
---

# Proposal: walkthrough-autostart-and-countdown-dutch

## Summary

Two faults the dossiq frontend lane found on the review instance of
10 October 2026:

1. The welcome tour reopened on every page load for a user who never touched
   it. `CnAppRoot.onWalkthroughProgress` skipped step 1 of a fresh tour to save
   a request, so a tour that opened on its own was never recorded. Closing it
   (X, ESC, the dim) already records it as paused.
2. The countdown tile read "56 days left" in a Dutch interface: its four
   headline strings had no Dutch.

## What changes

1. A fresh tour that opens on its own is recorded as paused at its first step
   (per-user preference), so the next page load keeps it hidden until the user
   picks "Continue" in the settings. The open tour itself is not affected, and
   the next step is recorded as before.
2. Dutch for "1 day left", "{count} days left", "1 day overdue" and
   "{count} days overdue", in the dossiq board wording ("Nog 56 dagen",
   "3 dagen te laat"). "Due today" already read "Vandaag".
