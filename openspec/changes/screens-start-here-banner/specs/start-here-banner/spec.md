# start-here-banner Delta: screens-start-here-banner

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-start-here-banner](../../)

## Purpose

Let an attention card name the first record of a configured query and open it, declared in the manifest.

## ADDED Requirements

### Requirement: A banner can name the first row of a query

A `banner` whose `visibleWhen.source` has `order` SHALL read the first row of that ordered query and use it as its
subject. `{subject.<field>}` in the kicker, title and reason SHALL be replaced by the row's value (`|date` and `|days`
format it), and `@subject.<field>` in an action's route SHALL become the value. When the query has no row and the
condition is `notEmpty` on `id`, the card SHALL not render and a dashboard SHALL give up its cell.

#### Scenario: Begin hier

- **GIVEN** a card titled `{subject.title}` over tickets ordered by deadline, with the action route param `@subject.id`
- **WHEN** the first ticket is "Afvalpas werkt niet bij de container" with id t-9
- **THEN** the title reads that text and the action links to the ticket detail of t-9

#### Scenario: Nothing to start with

- **WHEN** the query returns no rows
- **THEN** nothing renders

### Requirement: A card can stack its action under the text

With `stacked: true` an attention card SHALL put its actions under the text, with a 16px title.

#### Scenario: Stacked

- **WHEN** `stacked` is true
- **THEN** the action sits below the reason, left-aligned
