---
kind: code
---

# Proposal: screens-admin-settings-board-header

## Summary

The *Beheer* boards (LpBeheerAlgemeen and the rest) draw an admin settings page as a 28px title with a path line
under it ("Beheerinstellingen / Launchpad / Algemeen · geldt voor de hele organisatie"), a Documentatie button on the
right, and full-width cards in two columns. Three things stopped an app from drawing that (launchpad #862):

- CnSettingsSection's `wide` changed no pixel. NcSettingsSection caps a section at 900px in its own scoped CSS
  (`width: min(900px, ...)`, and its name and description), and `wide` only set a grid column.
- An admin page has no CnAppRoot around it, so `.cn-look-board` never reached it. CnAdminSettingsShell's `look:
  "board"` drew the board header markup, but none of the board CSS applied.
- The shell's board header had a title, a description and the Documentatie button, but no path line.

## Scope

- `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`: `breadcrumbs`, `breadcrumbNote`, and the
  `cn-look-board` class on a shell told `look: "board"` itself.
- `src/css/look-board.css`: the shell's own-class selectors, the path line, and `wide` lifting the 900px cap under
  the board look.
- `l10n`: "Breadcrumb" ("Kruimelpad").
- No manifest key, no schema change.
