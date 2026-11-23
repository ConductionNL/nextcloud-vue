---
kind: code
---

# Proposal: record-list-cards

## Summary

A record list draws rows, a feed or inline links. Board ShBank draws the four bank accounts as separate cards: a bank
icon and the account name with a pill beside them ("PSD2", "Afschrift importeren"), the IBAN under it, and the balance
as a large figure. shillinq reads those accounts through a record list over `/api/v1/cash-position` (`endpointSource`,
#1643), so the list needs a card presentation to draw them.

`presentation: "cards"` draws each row as a framed card in a grid of at least 240px per card, 16px apart: the `icon`
(only when the list declares one) and `title` with the `pill` and `badges` beside them, the `meta` line, and `trailing`
as the large figure. A card with `rowRoute` is a link. Under the board look the cards keep the rows' 24px inset inside a
titled card and stand flush in a borderless cell (`layout[].borderless: true`), as ShBank draws them on the page ground.

## Scope

- `src/components/CnRecordListWidget/CnRecordListWidget.vue`: the `cards` presentation and its styles.
- `src/css/look-board.css`: the inset of a card list on a dashboard card and in a borderless cell.
- No manifest schema change: a dashboard widget's `content` is not validated field by field.
- The default stays `rows`; an absent or unknown `presentation` draws rows as before.
