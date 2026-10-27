# object-card: delta for card-list-chips

## ADDED Requirements

### Requirement: A card draws a chip per entry of a list and a meta part from a template

A card layout chip with `each` MUST draw one pill per entry of its list field: `each` names the entry's field, or is a template filled from the entry. Empty entries MUST be left out. A meta part `{ template }` MUST read as the template filled from the object, in the host's translation.

#### Scenario: a pipeline's stages

- GIVEN pipeline Verkoop with stages Nieuw, Benaderd, Gekwalificeerd, Voorstel, Gewonnen and Verloren
- WHEN its card has `chips: [{ field: 'stages', each: 'name' }]` and `meta: [{ template: '{stages|count} stages' }]`
- THEN the card shows six stage pills
- AND its meta line reads "6 fases" in Dutch
