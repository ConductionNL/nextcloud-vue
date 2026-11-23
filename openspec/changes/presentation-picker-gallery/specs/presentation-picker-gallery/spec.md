## ADDED Requirements

### Requirement: A saved view can be chosen to show as a gallery

The presentation picker SHALL offer Gallery when the schema has a string property to title a card, with pickers for
the title, an optional cover image (a file, a list of files or an image string), up to four card fields and the card
size, and SHALL emit `{ viewType: "gallery", gallery: {...} }`. A saved view SHALL keep a gallery presentation.

#### Scenario: a gallery of products
- **GIVEN** a schema with `name` (string) and `photo` (file)
- **WHEN** the editor picks Gallery
- **THEN** the picker emits `{ viewType: "gallery", gallery: { titleField: "name", coverField: "photo" } }`
