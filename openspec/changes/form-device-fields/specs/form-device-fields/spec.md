## ADDED Requirements

### Requirement: A form can ask for a signature, a spoken note and a position

A form page SHALL render a `signature` field as a signature capture that stores the drawn image, an `audio` field as a
recorder that asks for the microphone only on Record and stops after `maxSeconds`, and a `location` field as a position
capture that writes the latitude and longitude into its `latField` and `lngField`.

#### Scenario: a position on an inspection form
- **GIVEN** a `location` field with `latField: "lat"` and `lngField: "lng"`
- **WHEN** the device reports 51.9, 4.48
- **THEN** the form sends `lat: 51.9` and `lng: 4.48`

### Requirement: A map page can show and centre on the reader's position

A map page with `showUserLocation` SHALL draw the reader's position and its accuracy, and with `centerOnUser` SHALL centre
the map on it, asking the browser only on such a page.

#### Scenario: centring on the reader
- **GIVEN** a map page with `centerOnUser: true`
- **WHEN** the map has loaded and the device reports its position
- **THEN** the map is centred there
