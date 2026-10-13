---
kind: code
---

# Proposal: screens-credentials-app-name

## Summary

The credentials section of the user settings dialog names the app in its copy ("What {app} uses"). CnAppRoot hands
the app id on when the app gives no display name, so launchpad's dialog read "Wat launchpad gebruikt". The section
now shows a name: the given one when it is a real name, else the name in Nextcloud's app menu, else the id with a
capital.

## Scope

- `src/utils/appShownName.js` (internal), used by `CnCredentials`.
- No manifest schema change. An app that passes a display name sees no difference.
