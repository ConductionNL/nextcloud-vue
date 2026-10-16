---
kind: code
---

# Proposal: link-cards-notes

## Summary

The board PqGeavanceerdHub draws the `links` page with more on each card than a label and a description: a chip with a note in a tone ("7 rapportages", "7 actief, 2 gepauzeerd" in green, "1 koppeling heeft een fout" in red, "Afgelopen nacht is 1 taak mislukt" in amber, "Opent in een nieuw tabblad"), a chevron at the end of an in-app card and an external-link icon on an external one, a "Persoonlijke instellingen" card that opens the user settings modal, and under the cards a panel only administrators see ("Alleen beheerders", a text and "Beheerinstellingen openen") beside the app's own menu structure form.

`CnLinkCardsPage` gains:

- `cards[].note`: a string, `{ text, tone?, counts?, when?, textOne? }`, or a list of those. `counts` names lists (`{ register, schema, filter? }`) counted with one `_limit=1` request each; `{name}` in the text is replaced by the count; `when` makes a note apply only while that count is above 0, so a list can say "1 koppeling heeft een fout" in red and otherwise something calm.
- a trailing chevron or external-link icon on every card;
- `cards[].action: "user-settings"`: the card opens CnAppRoot's user settings modal, and is left out where there is none;
- `config.adminPanel` (`{ text, href | route, linkLabel, component }`) and an `#admin` slot, drawn under the cards to administrators only.

## Scope

- `src/components/CnLinkCardsPage/CnLinkCardsPage.vue`, schema 2.114.0 (`$defs/linkCard`, `$defs/linkCardNote`, links `config.adminPanel`), `l10n/en.json`, `l10n/nl.json`.
