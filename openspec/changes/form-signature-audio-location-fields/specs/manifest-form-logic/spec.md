# manifest-form-logic Delta: form-signature-audio-location-fields

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [form-signature-audio-location-fields](../../)

## Purpose

A form page takes a signature, a short audio clip and the user's
position as field types. Answers buildiq `forms-signature-audio-and-location`,
REQ-BQSA-001. Rows `form-signature` and `form-audio-record` (buildiq
matrix), and the form half of `pg-device-location`.

## ADDED Requirements

### Requirement: Form pages accept signature, audio and location fields

The manifest schemas and `validateManifestV2()` SHALL accept `signature`,
`audio` and `location` as `fields[].type` on `type: "form"` pages, with
the options `allowTyped` and `allowDrawn` (signature), `maxSeconds`
between 5 and 120 and `maxSize` (audio), and `latField`, `lngField`,
`accuracyField` and `allowMapPick` (location). A signature field SHALL
allow at least one mode. A location field SHALL name both `latField` and
`lngField`. A `type: "settings"` page SHALL reject the three types, as
it rejects `file`. `cnRenderFormField` SHALL render each type with its
own field component and SHALL NOT fall back to a text input for them.

#### Scenario: A maker's inspection form validates

- GIVEN a form page "Opleveringsrapport" with a field `handtekening` of type `signature`, `allowDrawn: true`, `allowTyped: false`
- WHEN the manifest is validated
- THEN it is valid
- AND the page renders a drawing pad for `handtekening`, not a text box

#### Scenario: A signature with no mode is refused

- GIVEN a `signature` field with `allowTyped: false` and `allowDrawn: false`
- WHEN the manifest is validated
- THEN validation fails with an error naming that field

### Requirement: A signature is sent as a PNG image

The signature field SHALL send a PNG `data:` URL whether the user drew
or typed the signature. A typed signature SHALL be drawn onto an image
in the signature font before it is sent. A value that is already a
stored file SHALL be shown as that image with a "Sign again" action.
Clearing the signature SHALL set the value to null.

#### Scenario: An inspector types a signature

- GIVEN the form "Opleveringsrapport" with a `handtekening` field allowing typed signatures
- WHEN the inspector types "J. de Vries" and submits
- THEN the payload holds `handtekening` as a `data:image/png;base64,` URL
- AND the image shows "J. de Vries" in the signature font

### Requirement: An audio field records a clip no longer than its limit

The audio field SHALL start the microphone only when the user presses
Record, SHALL stop by itself at `maxSeconds`, SHALL let the user play
the clip back and record again, and SHALL send the clip as a `data:`
URL at 32 kbit/s. It SHALL release the microphone on Stop, at the limit
and when it unmounts. When the browser cannot record, or the user or the
page policy refuses the microphone, the field SHALL say so and SHALL
leave the value unchanged. The library SHALL export the rate and a
helper that returns the byte size of a clip of a given length.

#### Scenario: A field worker leaves a spoken note

- GIVEN a form "Melding" with an audio field `toelichting` and `maxSeconds: 30`
- WHEN the field worker presses Record and speaks for 40 seconds
- THEN recording stops at 30 seconds
- AND a player plays back the 30-second clip
- AND the payload holds `toelichting` as a `data:audio/` URL

#### Scenario: The microphone is refused

- GIVEN the same form on a browser where the user refuses the microphone
- WHEN the field worker presses Record
- THEN the field shows that the microphone is not available
- AND `toelichting` stays empty

### Requirement: A location field fills the latitude and longitude properties

The location field SHALL read the device position once when the user
presses "Use my position", SHALL offer a map where a click places the
pin when `allowMapPick` is not false, and SHALL always offer latitude
and longitude inputs. On submit `CnFormPage` SHALL write the latitude to
`latField`, the longitude to `lngField` and the accuracy in metres to
`accuracyField` when set, and SHALL NOT send the field's own key. In
`edit` mode the field SHALL start from those properties in
`initialValue`. The field SHALL NOT read the position when the form
mounts.

#### Scenario: A field worker records where the damage is

- GIVEN a form "Melding" with a location field `positie`, `latField: "lat"`, `lngField: "lng"` and `accuracyField: "nauwkeurigheid"`
- WHEN the field worker presses "Use my position" and allows it
- THEN the field shows the coordinates and "accurate to about 12 m"
- AND the submitted payload holds `lat`, `lng` and `nauwkeurigheid`, and no `positie`

#### Scenario: A user who refuses places a pin instead

- GIVEN the same form and a user who refuses the position
- WHEN the user clicks the map at the town hall
- THEN the pin moves there
- AND the payload holds the town hall's latitude and longitude
