## ADDED Requirements

### Requirement: An image field holding a file shows the file

An image field in the data widget SHALL take its picture from the value: a string as stored, a file object's `downloadUrl`, `accessUrl` or `url` (in that order), or the first file of a list. A value that gives no URL SHALL NOT render an image.

#### Scenario: a map picture uploaded as a file
- **GIVEN** a map object whose `image` holds `{ id: 122, downloadUrl: '/index.php/apps/openregister/api/files/122/download' }`
- **THEN** the data widget's image row shows `<img src="/index.php/apps/openregister/api/files/122/download">`

#### Scenario: a picture stored as a URL
- **GIVEN** a record whose `photo` is `https://example.org/a.png`
- **THEN** the image row shows that URL
