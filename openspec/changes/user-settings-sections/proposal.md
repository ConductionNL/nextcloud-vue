---
kind: code
---

# Proposal: user-settings-sections

## Summary

Filling `CnAppRoot`'s `#user-settings` slot drops every default section of the
user settings dialog: the notifications pane, the credentials pane and the
walkthrough replay. Nothing reports it, so dossiq, decidiq, openregister and
launchpad each draw credentials and the walkthrough again by hand, and read
CnAppRoot's internals to do it. The integrations section ("Koppelingen") sits
outside the slot on purpose, so an app cannot hide it, although several boards
(DqPersoonlijkeInstellingen among them) do not draw it.

## What changes

1. A new slot, `#user-settings-sections`, ADDS the app's sections to the
   library's defaults instead of replacing them.
2. A new prop, `userSettingsSections`, lists the sections to draw, in order:
   `app` (the app's slot content), `notifications`, `credentials`,
   `walkthrough`, `integrations`. A key left out is not drawn, the
   integrations section included. The app's slot content is never dropped:
   without `app` in the list it comes first.
3. The older `#user-settings` slot keeps exactly what it drew: its content and
   the integrations section. The four apps that fill it today render
   unchanged; each can drop its hand-drawn copies later by passing
   `userSettingsSections` or moving to the new slot.

A prop, not a manifest key: the dialog is configured where the app mounts
`CnAppRoot` and fills its slots, and a prop needs no manifest schema version.
