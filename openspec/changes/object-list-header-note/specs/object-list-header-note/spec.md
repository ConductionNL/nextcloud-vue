## ADDED Requirements

### Requirement: an object list can say its counts beside its card title

CnObjectListWidget MUST accept `content.headerNote`, filled with the same count tokens as `headerSubtitle` and translated through the host, and MUST report it as the `note` of its `header` event, so the card draws it beside the title. When the note becomes empty after one was shown, the widget MUST report an empty note.

#### Scenario: DqZaakContact contact moments
- GIVEN the case's contact-moments card with `headerNote: "{total} recorded"` and four moments, in Dutch
- THEN the card shows "4 vastgelegd" beside its title
