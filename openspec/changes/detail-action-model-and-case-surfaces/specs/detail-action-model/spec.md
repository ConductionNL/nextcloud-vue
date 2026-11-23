# detail-action-model Delta: detail-action-model

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-action-model-and-case-surfaces](../../)

## Purpose

A detail page that tells a handler what to do next, keeps the daily actions
one click away and puts everything else in a grouped menu. Plus the case
surfaces the Zuiddrecht design needs. Related: ADR-004 (component rules),
ADR-062 (detail page), WCAG 2.2 AA.

## ADDED Requirements

### Requirement: Primary action follows the stage

`CnDetailPage` SHALL accept `primaryActionByStage`, a map from a stage value to
an action, and `stageField` (default `status`). When the record's stage has an
entry, that action SHALL be the page's primary button. An entry is an action
object in the header action shape, or the id of a `headerActions` entry. With
no entry for the stage the page SHALL fall back to `primaryAction`.

#### Scenario: The label changes with the stage

- **GIVEN** `primaryActionByStage: { received: { id: "take", label: "Take on" } }`
- **WHEN** the record's `status` is `received`
- **THEN** the primary button SHALL read "Take on"
- **AND** clicking it SHALL dispatch the action the same way a header action is dispatched

#### Scenario: A stage without an entry falls back

- **GIVEN** a `primaryAction` and a `primaryActionByStage` without the record's stage
- **WHEN** the page renders
- **THEN** the primary button SHALL be the `primaryAction`

#### Scenario: A page that declares neither is unchanged

- **GIVEN** no `primaryAction` and no `primaryActionByStage`
- **WHEN** the page renders
- **THEN** no primary button and no skip link SHALL render

### Requirement: Quick actions

`CnDetailPage` SHALL accept `quickActions`, rendered as always visible outlined
buttons in the header. At most three SHALL render; later entries are dropped.
An entry is an action object or the id of a `headerActions` entry. An action
rendered as a button SHALL NOT also appear in the overflow menu.

#### Scenario: Four declared, three shown

- **GIVEN** four `quickActions`
- **WHEN** the page renders
- **THEN** three buttons SHALL render, in declaration order

### Requirement: Grouped and admin only menu actions

A `headerActions` entry MAY carry `group` and `adminOnly`. Entries with a
`group` SHALL render under a caption with that name, in first appearance
order, after the ungrouped entries. An `adminOnly` entry SHALL be hidden from
non admins and SHALL render in the last group for admins. `adminOnly` gates
visibility only and is never an authorization decision.

#### Scenario: Groups get a caption

- **GIVEN** two actions with `group: "Case"` and one with `group: "Publication"`
- **WHEN** the menu opens
- **THEN** the captions "Case" and "Publication" SHALL render, each above its own entries

#### Scenario: A handler does not see admin actions

- **GIVEN** an action with `adminOnly: true` and a user who is not an admin
- **WHEN** the menu opens
- **THEN** the action SHALL NOT render

### Requirement: Actions menu built ins are optional

`CnDetailPage` SHALL accept `actionsMenu: { showRefresh?, showHelpLinks?, label? }`.
`showRefresh: false` SHALL remove Refresh. `showHelpLinks: false` SHALL remove
Request a feature, Report a bug and Documentation. `label` SHALL name the menu.
Omitted keys SHALL keep today's behaviour.

#### Scenario: Help links move out of the record

- **GIVEN** `actionsMenu: { showRefresh: false, showHelpLinks: false, label: "More" }`
- **WHEN** the menu opens
- **THEN** only the page's own actions SHALL render, in a menu named "More"

### Requirement: Next step card

The library SHALL provide `CnNextStepCard`: a heading, a checklist whose items
carry a label, a done flag and an optional hint, an action area and an optional
"after this" line. `CnDetailPage` SHALL render it above the body from
`nextStep: { stages: { <stage>: { title?, checklist, after? } } }`. An item is
done when `doneField` is truthy on the record or `doneWhen` evaluates true. The
card SHALL be hidden when the stage declares no checklist. While the card is
shown the primary button SHALL render inside it and not in the header. The
`next-step` detail widget type SHALL render the same card.

#### Scenario: Done and open items read differently without colour

- **GIVEN** a checklist with one done and one open item
- **WHEN** the card renders
- **THEN** each item SHALL carry a text state, "Done" or "To do", for a screen reader

#### Scenario: A stage with no checklist shows no card

- **GIVEN** `nextStep.stages` without the record's stage
- **WHEN** the page renders
- **THEN** no card SHALL render and the primary button SHALL stay in the header

### Requirement: Header pills

`CnDetailPage` SHALL accept `typePill` and `statusPill`, each
`{ field, colorMap?, labels?, variant? }`, rendered through `CnStatusBadge`
above the title. A pill whose field is empty SHALL NOT render.

#### Scenario: The status reads above the title

- **GIVEN** `statusPill: { field: "status", colorMap: { open: "success" } }` and a record with `status: "open"`
- **WHEN** the page renders
- **THEN** a success badge reading "open" SHALL render above the title

### Requirement: Side column

`CnDetailPage` SHALL accept `sideColumn`, a list of widget definitions or ids
of declared widgets, rendered as a right hand column of cards next to the body.
The column SHALL stack under the body when the page is too narrow for both.
Pages without `sideColumn` SHALL lay out exactly as before.

#### Scenario: Facts sit beside the body

- **GIVEN** `sideColumn` with two widgets
- **WHEN** the page renders
- **THEN** a complementary region SHALL hold both, after the body in reading order

### Requirement: Tab counts and overflow

`CnTab` SHALL accept `count` and `overflow`. A count SHALL render after the
title and be part of the tab's accessible name. Overflow tabs SHALL be listed
in a "More" menu beside the strip; choosing one SHALL select it and show it in
the strip while it is active. `CnTabsWidget` SHALL accept `maxVisibleTabs`,
`hideEmpty` and per tab `count`, `countField` and `overflow`.

#### Scenario: Tabs past the limit collapse

- **GIVEN** seven tabs and `maxVisibleTabs: 5`
- **WHEN** the strip renders
- **THEN** five tabs SHALL render and a "More" menu SHALL list the other two

#### Scenario: An empty tab moves under More

- **GIVEN** `hideEmpty: true` and a tab whose count is 0
- **WHEN** the strip renders
- **THEN** that tab SHALL be listed under "More"

#### Scenario: A strip with no overflow is unchanged

- **GIVEN** tabs without `count` or `overflow`
- **WHEN** the strip renders
- **THEN** no "More" menu SHALL render

### Requirement: Document review list

The library SHALL provide `CnDocumentReviewList`: rows of files, each with a
name, a meta line, a review status badge and an optional row action, plus a
progress summary ("2 of 5 reviewed"). The status field, its values, labels,
colours and which values count as reviewed SHALL be configurable. The
`document-review` detail widget type SHALL render it from a field on the record.

#### Scenario: Progress counts reviewed rows

- **GIVEN** five rows of which two have a reviewed status
- **WHEN** the list renders
- **THEN** the summary SHALL read "2 of 5 reviewed"

#### Scenario: No documents

- **GIVEN** no rows
- **WHEN** the list renders
- **THEN** an empty text SHALL render and no summary

### Requirement: Conversation thread

The library SHALL provide `CnConversationThread`: messages with author, time
and side (`us` or `them`), and a labelled reply box. Sending SHALL emit `send`
with the text, and SHALL POST `{ message }` to `endpoint` when one is set. The
component SHALL NOT depend on Talk. The `conversation` detail widget type SHALL
render it from a field on the record.

#### Scenario: Sending a reply

- **GIVEN** a reply box holding text
- **WHEN** Send is pressed
- **THEN** `send` SHALL be emitted with the text
- **AND** the box SHALL clear once the send succeeds

#### Scenario: An empty reply is not sent

- **GIVEN** an empty reply box
- **WHEN** the thread renders
- **THEN** Send SHALL be disabled

### Requirement: Late marking on board cards

`CnBoardView` and `CnObjectKanban` SHALL accept `dueRule: { field, soonDays? }`.
A card whose date is before today SHALL carry an error edge and the label
"Overdue". A card due within `soonDays` (default 3) SHALL carry the label
"Due soon" in the warning colour. The state SHALL be conveyed in text, not by
colour alone. Without `dueRule` cards SHALL render as before.

#### Scenario: An overdue card says so

- **GIVEN** `dueRule: { field: "deadline" }` and a card whose deadline was yesterday
- **WHEN** the board renders
- **THEN** the card SHALL carry the text "Overdue"

### Requirement: Navigation brand

`CnAppNav` SHALL accept `brand: { logo?, name?, caption? }`, from the prop or
from `manifest.nav.brand`, and a `brand` slot, rendered at the top of the
navigation. The logo SHALL be decorative when a name is shown. Without a brand
nothing SHALL render there.

#### Scenario: A brand block above the menu

- **GIVEN** `nav.brand: { logo: "/logo.svg", name: "dossiq", caption: "Gemeente Zuiddrecht" }`
- **WHEN** the navigation renders
- **THEN** the logo, "dossiq" and "Gemeente Zuiddrecht" SHALL render above the primary action
