# related-record-read-once Delta: data-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [related-record-read-once](../../)

## ADDED Requirements

### Requirement: A related record is read once per page open

When several data widgets on a page, or a data widget and the detail page's visibility rows (`visibilityContext`), name the same related record (the same register, schema and id), the library SHALL send one read for it and give every reader the same answer. An answered read SHALL be shared for 30 seconds; after that the next widget reads it again. A failed read SHALL NOT be shared: the next widget that needs the record SHALL read it again.

#### Scenario: Five cards name the same case type

- GIVEN a detail page with five data widgets whose record points at case type `type-1`
- WHEN the page opens
- THEN one GET `/apps/openregister/api/objects/{register}/caseType/type-1` is sent
- AND every widget shows the case type's name

#### Scenario: A failed read is tried again

- GIVEN the read of a related record failed for the first widget
- WHEN a second widget needs the same record
- THEN the second widget sends its own read

#### Scenario: The visibility rows and a card name the same case type

- GIVEN a detail page whose `visibilityContext` reads the case type and a data card that names it
- WHEN the page opens
- THEN the case type is read once for both
