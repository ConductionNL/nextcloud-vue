---
kind: code
---

# Proposal: screens-reports-page-pq-board

## Summary

The reports page is a library page: it comes from nextcloud-vue and looks the same in every app. Board PqReports draws it
with category chips and counts above the sections, small uppercase captions, three cards a row (icon tile, title,
category, description, a footer note and an Open button), a 300px side column (the categories with counts and a note
card) and a footnote. The board look drew board DcRapportages instead: 18px section headings, two-up cards that were
links, and no chips, side column or footnote.

Under the board look the reports page now draws board PqReports. The DcRapportages parts the new board keeps (header
buttons, widgets under the cards, uncategorised cards first) stay as they were.

## Scope

- `src/components/CnReportsPage/CnReportsPage.vue`: the board template, `footnote` and `sideNote` props, chip counts,
  `visibleSections`, `cardNote`, `showSection`.
- `src/css/look-board-reports.css`: the board PqReports rules.
- Manifest schema 2.110.0: page `config.footnote` and `config.sideNote` (reports). A report card's `note` is read from the
  card; reports cards are not schema-validated.
- `l10n/en.json`, `l10n/nl.json`: the page's copy, including "All categories" and "Category", which had no entry.
- The Nextcloud look is unchanged.

## Not in this change

- The board's lead text ("Een pagina die elke app heeft ...") is the app's `description`, as before.
