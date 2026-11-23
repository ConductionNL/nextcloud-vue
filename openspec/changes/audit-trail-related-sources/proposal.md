# Proposal: audit-trail-related-sources

## Why

Board DqSociaalDomein's side "Historie" lists "Toestemming vastgelegd" beside
the case's own events. Recording a consent writes the consent object's audit
trail, not the case's, so a card over the case's trail cannot show it. The same
holds for any record that lives beside an object (a task, a decision, an
advice request) and whose events belong in that object's history.

## What changes

An object audit trail card may declare `relatedSources`:
`[{ as, register, schema, filter, limit? }]`. For each, the card lists the
objects that match `filter` (`@objectId` is the card's object, `limit`
defaults to 5, newest first), reads each one's audit trail, and merges those
entries with the object's own, newest first. An entry from a related source is
labelled by `actionLabels["<as>.<action>"]` (with `:<state>` tried first), then
by its plain action label. A related read that fails leaves its entries out;
the object's own trail still shows.

## Cost

One list read per source plus one trail read per related object (at most
`limit`), only when the card declares related sources.
