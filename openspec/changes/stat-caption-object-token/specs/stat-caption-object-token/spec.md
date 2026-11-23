# stat-caption-object-token Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A stat caption can name a field of the page's record

A stat tile's caption SHALL fill `@object.<field>`, `@objectId`, `@workspace.<key>` and `@config.<key>` from the page's contexts, after translation, the way a source's filter tokens are filled. A token that resolves to nothing SHALL leave no text behind.

#### Scenario: PqEvenement Aangemeld

- **GIVEN** an event with 80 places and the tile caption "of @object.capacity places"
- **THEN** the caption reads "of 80 places" ("van 80 plaatsen")
