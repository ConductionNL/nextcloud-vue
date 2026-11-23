# Proposal: assign-team-option-subline

## Why

Board DqOverdragen draws each team in the hand-over dialog's list with a line under its name: "6 leden · bezwaar, beroep
en Woo-advies". The dialog drew the name alone. Decided 25 Oct (coordinator): build it generically, the member count plus
the team description; Nextcloud keeps no description for a group, so the description comes from the app's records
(dossiq: the organisation role) when the cast has one.

## What changes

- `utils/groupSublines.js`: per group id, "{count} member(s)" from Nextcloud's group details (OCS
  `cloud/groups/details`, which answers administrators and group admins; for others the count is left out) and the
  description from an app-named source, joined by " · ". The source is read once per dialog session.
- CnAssignDialog takes `assignee.describe: { register, schema, groupField?, textField? }` and puts that line under each
  team option (`secondary`). Without `describe` the count alone shows where readable.
