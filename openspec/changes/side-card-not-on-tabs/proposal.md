# Proposal: side-card-not-on-tabs

## Why

DqZaakAssistent draws the side column beside the AI-toezicht tab with one card, "Assistent". The generic side cards
(term, requester, handling, work instruction) show beside every tab, and `tabs` can only name the tabs a card is FOR:
excluding one tab meant listing every other tab on every generic card, and every new tab would have to be added to all
of them.

## What changes

A side entry takes `notTabs` (tab ids): it stands aside while one of those tabs is open and shows beside every other
tab. `tabs` keeps its meaning; an entry may use both. Edit mode shows every entry, as before.

## Scope

Additive.
