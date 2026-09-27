---
kind: code
depends_on: []
---

# Proposal: form-signature-audio-location-fields

## Why

A maker in buildiq wants a form that takes a signature, a spoken note or
the user's position, and a map page that shows where the user stands.
Buildiq's field builder can offer those types, but the form is drawn by
this library. `cnFormFieldRenderer.js` knows seven field types, and an
unknown one falls back to a text input with a console warning. So a
`signature` field today renders as a text box.

The parts exist. `CnSignatureCapture` draws and types signatures. The
AI dictation code records the microphone. `CnMapWidget` places a pin on
a click and has a "Show my location" button. None of them is a form
field, and `CnMapPage` cannot mark the user's position.

## Rows

The requesting change is buildiq `forms-signature-audio-and-location`.
Its proposal, section "Sibling halves", names this half:

> nextcloud-vue: the renderer. At 2.57.1 `cnFormFieldRenderer.js` knows
> `boolean`, `number`, `password`, `string`, `enum`, `json` and `file`
> (line 127). It owes `signature` (wrapping `CnSignatureCapture`, which
> exists), `audio` (a recorder field) and `location` (a position field
> with a map fallback through `CnMapPoiPicker`, which exists), the
> `formField.type` values in the manifest schema, and a
> `showUserLocation` option on `CnMapPage`.

Its tasks.md, T06, sets the contract: "the three form field types in
`cnFormFieldRenderer.js`, the manifest schema values, and
`showUserLocation` and `centerOnUser` on `CnMapPage`, with this spec as
the contract. Verify: the nextcloud-vue change exists and cites
REQ-BQSA-001 and REQ-BQSA-003." Its design D1 names the options
(`allowTyped`, `allowDrawn`; `maxSeconds` 5 to 120, default 60;
`latField`, `lngField`, optional `accuracyField`, `allowMapPick` default
true) and D3 names `config.showUserLocation` and `config.centerOnUser`.

Rows the requesting change covers:

| matrix | row | name |
|---|---|---|
| buildiq | `form-signature` | Collect a signature in a form. |
| buildiq | `form-audio-record` | Record audio in a form, for example a spoken note. |
| buildiq | `pg-device-location` | Read the user's current location from their device inside an app. |

Read for this change: `CnMapPoiPicker` is not a map. It is a dialog that
lists saved Nextcloud Maps favourites and emits `{ favoriteId }`. The
map fallback uses `CnMapWidget`'s click, the way `CnObjectGeoWidget`
places its marker. And a typed signature leaves `CnSignatureCapture` as
plain text, not an image, so the field turns it into one.

## What changes

- A `signature` form field wraps `CnSignatureCapture` and always sends a
  PNG `data:` URL, typed or drawn.
- An `audio` form field records from the microphone up to `maxSeconds`,
  plays the clip back, and sends it as a `data:` URL.
- A `location` form field reads the device position on a button press,
  offers a map pin and typed coordinates as fallbacks, and writes
  latitude, longitude and accuracy into the properties the field names.
- The manifest schema and the manifest validator accept the three types
  and their options on form pages.
- `CnMapPage` takes `showUserLocation` and `centerOnUser`: a marker with
  an accuracy circle at the user's position, and centring on it when the
  page opens.

## Affected projects

- `nextcloud-vue`: `cnFormFieldRenderer.js`, `CnFormPage`, new
  `CnSignatureField`, `CnAudioField` and `CnLocationField`, `CnMapPage`,
  `CnMapWidget`, the manifest schemas, `validateManifest.js`.
- Consumers: buildiq built apps first. Any form page can use the types.

## Backward compatibility

The three type names are new. A manifest that does not use them renders
exactly as before. `showUserLocation` and `centerOnUser` default to
false, so existing map pages keep their current behaviour, including the
"Show my location" button they already have.

## Out of scope

- Tracking a position over time or in the background. The buildiq change
  rules this out too.
- Video and photos. The camera belongs to `form-file-and-camera-fields`
  and to `scan-and-generate-codes`.
- Recordings longer than two minutes, which need an upload flow rather
  than an inline file.
- The browser permission policy. Buildiq sets it per app on the page it
  serves (its design D4); this library only asks when the user presses a
  button, or on open when `centerOnUser` is set.
- Storing `CnSignatureCapture`'s `audit` block on the record. The
  buildiq spec stores the image only.

## Cross-project dependencies

- buildiq offers the types in its field builder, adds the `file` and
  number properties the values land in, and validates public-mode use
  (its REQ-BQSA-002 and REQ-BQSA-004).
- OpenRegister stores a `data:` URL sent to a `file` property, as it does
  for the existing `file` field. Nothing new is asked of it.
