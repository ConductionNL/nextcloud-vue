## ADDED Requirements

### Requirement: A flow page can curate its palette

A flow page MAY name its palette's groups and steps. The board MUST then draw only those, in the page's order and words,
and MUST keep every other catalogue step reachable through "More steps".

#### Scenario: A curated palette
- GIVEN a flow page with `paletteGroups` naming four groups and nine catalogue steps
- WHEN the flow board draws the palette
- THEN it shows those groups and steps in that order under the page's labels
- AND a step the catalogue does not offer is left out

#### Scenario: Every other step stays reachable
- GIVEN a curated palette
- WHEN the user presses "More steps"
- THEN the searchable picker with the whole catalogue opens

#### Scenario: No curation
- GIVEN a flow page without `paletteGroups`
- THEN the palette lists the whole catalogue grouped per app, as before
