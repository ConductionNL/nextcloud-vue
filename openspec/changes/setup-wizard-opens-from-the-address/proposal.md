---
kind: code
---

# Proposal: setup-wizard-opens-from-the-address

## Summary

An app's setup wizard opens on its own once, and then only when a required step
is unmet. An administrator who wants to go through it again has no way back in:
portaliq's PtInstellen board draws the wizard opened from the app, and nothing
on live opens it. The address can now ask for it: `?setup=open` on any route of
an app opens the wizard, also after it was finished or dismissed. An app offers
"set up again" as a menu entry or a link with that query.

## Impact

- `CnAppRoot`: a watcher on `$route.query.setup`.
- No change for an app that never puts `setup=open` in an address.
