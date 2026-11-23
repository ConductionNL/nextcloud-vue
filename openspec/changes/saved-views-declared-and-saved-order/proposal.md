# Proposal: saved-views-declared-and-saved-order

## Why

DqFilterBeheren draws Standaardweergaven as dossiq declares them (Mijn zaken, Alle lopende zaken, Termijn verstreken) and
Mijn weergaven in the order Pieter saved them (Termijn deze week, Wacht op inwoner, Opgeschort). :8080 (r26a, 25 Oct)
sorted both alphabetically, so the panel never matched.

## What changes

Seeded views keep the order the app declares; own views follow their saved time (`created`, oldest first), views
without one after them by name. Children under a parent stay alphabetical. Both orders are stable between two openings.
