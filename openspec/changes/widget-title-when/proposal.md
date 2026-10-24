# Proposal: widget-title-when

## Why

The case page's Files card is one widget for every case type, but the boards title it per case type: a case type that
reviews its documents draws "Documenten bij dit verzoek" (DqZaakDocumenten), another draws the files with no title row
at all (DqDocumentenBeheer). Live always showed "Bestanden" (COMPDIFF r25 DqDocumentenBeheer: header present vs
absent). A subtitle could already depend on the record (`subtitle: [{ when, text }]`); a title could not.

A widget's `title` is read in many places: the card's title row, a leaf card's title, the tab strip's label and panel
heading, the absent-integration card. A title that is sometimes an array would break every one of them, so the
condition is resolved once, before any of them reads it.

## What changes

- A widget definition may carry `titleWhen: [{ when?, text }]`. On a detail page the first entry whose `when` holds
  (the `visibleWhen` grammar against the record and its `@context` rows) becomes the widget's plain `title` before the
  definition reaches the card, the tab strip or a leaf. An entry without `when` always holds. With no record yet or no
  entry holding, `title` stays as written.
- An empty `title` is a card without a title row: a leaf card and a host card draw no title then.
