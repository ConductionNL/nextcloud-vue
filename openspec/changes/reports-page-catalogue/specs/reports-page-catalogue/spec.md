# reports-page-catalogue Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [reports-page-catalogue](../../)

## ADDED Requirements

### Requirement: A board reports page can be a catalogue

In the board look `CnReportsPage` SHALL render its title as the page's `h1`. With `catalogue: true` it SHALL render the
categories as chips with their counts that narrow the sections, each card as an article with its icon, title, category,
description and a footer with its line and an Open link to its route, and an aside with the category index and the
optional `asideNote`. Without `catalogue` the board look SHALL keep its sections.

#### Scenario: PqReports

- **GIVEN** pipelinq's reports page with eight reports in five categories and `catalogue: true`
- **THEN** it shows "Alle categorieën 8" and a chip per category, the cards with Open, and the aside
