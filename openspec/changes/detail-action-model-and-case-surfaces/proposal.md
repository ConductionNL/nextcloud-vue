---
kind: code
---

# Proposal: detail-action-model-and-case-surfaces

## Summary

Gives a manifest detail page a four level action model and the surfaces a case
page needs, all opt in:

- the primary action follows the record's stage (`primaryActionByStage`),
- at most three always visible quick actions (`quickActions`),
- header actions grouped in the overflow menu, with an admin only group last
  (`group`, `adminOnly`), and a menu whose refresh and help links can be
  switched off (`actionsMenu`),
- a "what now" card with a checklist per stage (`nextStep`, `CnNextStepCard`),
- type and status pills above the title (`typePill`, `statusPill`),
- a named side column of fact cards (`sideColumn`),
- tab counts and a "More" overflow on the body tabs,
- `CnDocumentReviewList` and `CnConversationThread`,
- late marking on board and kanban cards (`dueRule`),
- a brand block at the top of the app navigation (`nav.brand`).

## Motivation

The dossiq case page declares 25 header actions, the library adds 4 and the
lifecycle adds 11 more. All 40 sit in one "Actions" menu with no primary
button, next to 13 body tabs and 6 sidebar tabs. The Zuiddrecht design
(`Acties.dc.html`, `DqZaak.dc.html`) replaces that with four levels: one
button that names the next step, three quick actions, a grouped "More" menu
and an admin group. A handler should never have to guess what to do next.

## Affected projects

- `nextcloud-vue`: `CnDetailPage`, `CnTabs`, `CnTab`, `CnTabsWidget`,
  `CnBoardView`, `CnObjectKanban`, `CnAppNav`, the v2 manifest schema, three
  new components and three new detail widget types.
- Consumers: dossiq first (case page, board, navigation). pipelinq, decidiq and
  learniq can adopt the same keys. Config only for the app.

## Backward compatibility

Every key is new and optional. A manifest that sets none of them renders
exactly as before: same header, same Actions menu with Refresh and the three
help links, same tabs, same board cards, same navigation. No existing prop,
slot, event or default changes. Minor version.

## Theming

Nextcloud CSS variables only (`--color-primary-element`, `--color-error`,
`--color-warning`, `--color-border`, `--border-radius-large`). thematiq
overrides those, so the Zuiddrecht palette arrives without a token of its own.
