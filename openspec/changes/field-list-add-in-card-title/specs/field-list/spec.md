# field-list Delta

## ADDED Requirements

### Requirement: A field list's add button can sit in the card title row

A field list with `add.trigger: "button"` and `add.placement: "title"` SHALL report its add button on its `header`
event for the card's title row and draw no add button in its body; pressing it SHALL open the add form above the rows,
and pressing it again SHALL close it. A read-only list reports no button.

#### Scenario: A case type's variants

- **GIVEN** the Varianten card with `add.placement: "title"`
- **THEN** "Variant toevoegen" sits beside the card title, and pressing it opens the name and description fields above the variants
