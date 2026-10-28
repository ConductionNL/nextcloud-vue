# object-list Delta: object-list-add-actions

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-list-add-actions](../../)

## Purpose

A list can be added to in more than one way and can end in the totals of the record it belongs to.

## ADDED Requirements

### Requirement: A list can offer more than one Add

An object list SHALL read `content.addActions` (`[{ label, icon?, createDefaults? }]`) as extra adds. Each SHALL open the
list's own create form with its `createDefaults` merged over the list's `createDefaults`; the list's own Add SHALL keep
the list's defaults. The host SHALL draw the extra adds wherever it draws the list's Add, and none while a declared
`createAction` replaces the create form.

#### Scenario: A line of your own

- **GIVEN** quote lines with `createDefaults` `{ kind: "catalogue" }` and an extra add "Add own line" with `{ kind: "own" }`
- **WHEN** the extra add is chosen
- **THEN** the create form opens with `kind` "own" and the quote already chosen

### Requirement: A list can end in the totals of the record it sits on

An object list SHALL read `content.totals` (`[{ label, path, format?, emphasis? }]`) from the record of the page it sits
on and draw them in a box beside the footnote, a `currency` value as a money amount in the reader's language, and a
label translated and then filled from the record (`{path}`, "VAT {vatRate}%"). A row
without a value SHALL be left out; without the key the footnote SHALL stay as it was.

#### Scenario: Board PqOfferte

- **GIVEN** a quote with subtotal 4428, VAT 929.88 and total 5357.88
- **WHEN** its lines list declares the three totals, the last with `emphasis`
- **THEN** the box reads Subtotal € 4.428,00, VAT € 929,88 and, set apart, Total € 5.357,88
