---
kind: code
---

# Proposal: version-card-dutch-and-header

## Summary

On pipelinq's admin page (board PqBeheer) a Dutch reader sees English chrome: the version card's "Up to date", "Application Name" and "Configured Version", the shell's "Support" footer and "<App> Settings" title, and the register mapping's "Name" column, "Saving...", "Importing..." and "Loading registers...". In a half-width card the header buttons overlap the card title.

- Every one of those strings goes through the library catalogue (`t('nextcloud-vue', ...)`), and `l10n/nl.json` holds the Dutch the board draws: "Naam van de app", "Ingestelde versie", "Bijgewerkt", "Ondersteuning", "Stel je Pipelinq-installatie in", "Soort object".
- The version card's `labels` prop now merges over the translated defaults, so an app that sets one label keeps the other two in the reader's language.
- The version card's own overlap was already gone: since #1629 and #1630 the board version card draws its buttons in its footer row and spans the grid. A board section that puts buttons in its header (`#actions`, the register mapping's save and re-import) still drew them absolutely over a long title. Under the board look that header is now a grid: the title wraps beside the buttons, and in a card narrower than 520px the buttons drop under the title and description.

## Scope

- `src/components/CnVersionInfoCard/CnVersionInfoCard.vue`, `src/components/CnRegisterMapping/CnRegisterMapping.vue`: strings through `t()`.
- `l10n/nl.json`, `l10n/en.json`: the new keys.
- `src/css/look-board.css`: the section header grid replaces the absolute actions.
- No schema change.
