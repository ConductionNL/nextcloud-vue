# manifest-map-widget (delta)

## ADDED Requirements

### Requirement: An image layer can take its picture from the record

On a record's page, an `image` layer's `url`, `width` and `height` SHALL accept `@objectId` and `@object.<path>` tokens that resolve against the record. A file property MUST resolve to its `downloadUrl`, else `accessUrl`, else `url`, and a list of files to its first file. While a token has no value the map MUST NOT open; once the record holds all three it SHALL open as an image map. A change of the record's picture SHALL replace the picture on the open map. The resolved URL MUST pass `safeHref`.

#### Scenario: The valley map shows its own picture

- GIVEN a map record with `image` (a file with a download URL), `width` 2400 and `height` 1600
- AND its detail page has a `map` widget with the layer `{ "type": "image", "url": "@object.image", "width": "@object.width", "height": "@object.height" }`
- WHEN the page loads the record
- THEN the map opens on flat coordinates with that picture over 2400 by 1600 pixels

#### Scenario: The map waits for the record

- GIVEN the same widget before the record is loaded
- THEN no map is created
- AND it is created once, as an image map, when the record arrives
