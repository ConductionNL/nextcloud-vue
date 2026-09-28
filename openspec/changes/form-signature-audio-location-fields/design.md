# Design: form-signature-audio-location-fields

Read at nextcloud-vue development `3e606bf10`, and buildiq's
`forms-signature-audio-and-location` change on buildiq development.

## What is there

- `cnRenderFormField` (`src/composables/cnFormFieldRenderer.js`) maps a
  field to a component through `DEFAULT_COMPONENT_MAP` (`:116-125`) and
  `KNOWN_TYPES` (`:127`). An unknown type renders `NcTextField` with one
  console warning (`:324-341`). The `file` branch (`:250-271`) binds
  `CnFileField`, whose value is a `data:` URL capped at
  `FALLBACK_MAX_BYTES`, 1 MB (`src/utils/widgetUpload.js:19`).
- `CnFormPage` renders every field through that helper
  (`src/components/CnFormPage/CnFormPage.vue:619-627`), holds one value
  per `field.key` (`updateField`, `:821-822`), and dispatches
  `effectivePayload` (`:569-577`). `mode` is `edit`, `create` or
  `public` (`:351-355`). `initialValue` seeds the draft (`cloneInitial`, `:593-599`).
- The closed `formField.type` enum lives in the v1 schema
  (`src/schemas/app-manifest.schema.json:898-901`) and the `formField`
  def is `additionalProperties: false` (`:884-887`). In the v2 schema,
  `config.fields[]` items are open objects that type only `visibleWhen`
  and `validation` (`src/schemas/app-manifest-v2.schema.json:2831-2848`).
  The runtime validator allows `FORM_PAGE_FIELD_TYPES`, the settings set
  plus `file` (`src/utils/validateManifest.js:1076-1077`).
- `CnSignatureCapture` takes `allowTyped`, `allowDrawn` and
  `initialMode` (`src/components/CnSignatureCapture/CnSignatureCapture.vue:113`,
  `:119`, `:125`) and emits only `change` (`:186`). A drawn value is a
  PNG `data:` URL from `toDataURL` (`:442`). A typed value is the plain
  text (`:439-440`), rendered on screen in `typedFont` (`:169`). It takes
  no value in, so it cannot show a signature already on a record.
- Recording exists for dictation: `browserRecordingUsable()`
  (`src/composables/aiSpeechPolicy.js:152`) and `createLocalDictation`
  with an injectable `getUserMedia` and `MediaRecorder`
  (`src/composables/aiLocalDictation.js:58`, `:273`).
- `CnMapPoiPicker` is a dialog listing Nextcloud Maps favourites from
  `/integrations/maps/available` (`src/components/CnMapPoiPicker/CnMapPoiPicker.vue:174`)
  and emits `link` with a favourite id (`:114`). It has no map.
- `CnMapWidget` emits `click` with `{ lat, lng }` on the map background
  (`src/components/CnMapWidget/CnMapWidget.vue:573-581`).
  `CnObjectGeoWidget` places its marker from that event
  (`src/components/CnObjectGeoWidget/CnObjectGeoWidget.vue:644-653`).
- `CnMapWidget` already has a "Show my location" button behind
  `locateControl`, on by default (`CnMapWidget.vue:325`, `:965-966`). It
  calls `map.locate({ setView: true })` (`:1065-1069`), draws nothing at
  the position, and only logs a denial (`:608-611`). `CnMapPage` does not
  forward `locateControl` (`src/components/CnMapPage/CnMapPage.vue:65-78`).
  The page renderer spreads `config` into the page's props
  (`src/components/CnPageRenderer/CnPageRenderer.vue:1313-1328`), so a
  declared prop receives `config.showUserLocation` directly.

## Decisions

### D1. Three field components behind three renderer branches

`cnRenderFormField` gains `signature`, `audio` and `location` branches
that bind three small field components: `CnSignatureField`,
`CnAudioField` and `CnLocationField`. Each takes `label`, `modelValue`
and its own options, and emits `update:modelValue`, the same contract
`CnFileField` has. The types are added to `KNOWN_TYPES`, to
`FORM_PAGE_FIELD_TYPES` (form pages only, like `file`), to the v1 enum,
and to the v2 `fields[]` items as a typed `type` with the options.

Rejected: mounting `CnSignatureCapture` through `config.fieldWidgets`.
Nothing in `src/` renders `fieldWidgets` today, and a widget there skips
the form's `visibleWhen`, `validation` and payload rules.

### D2. A signature is always an image

`CnSignatureField` wraps `CnSignatureCapture` and forwards `allowTyped`
and `allowDrawn`. A drawn signature is sent as the PNG `data:` URL the
capture already makes. A typed signature is drawn onto a canvas of the
same size in `typedFont` and sent as a PNG `data:` URL too. A value that
is not a `data:` URL (a file the record already holds) is shown as that
file's image with a "Sign again" button, following `CnFileField`'s rule
for existing files.

Rejected: sending the typed text. The target is a `file` property, and a
bare name there is not a file OpenRegister can store.

### D3. Audio is a short clip at a fixed rate

`CnAudioField` records with `MediaRecorder` at 32 kbit/s, preferring
`audio/webm;codecs=opus` and falling back to `audio/mp4` where the
browser supports only that. Recording stops by itself at `maxSeconds`
(5 to 120, default 60). The field shows a timer, Stop, a native
`<audio controls>` player and Record again, and sends the clip as a
`data:` URL. The library exports `AUDIO_FIELD_BITS_PER_SECOND` and
`audioClipBytes(seconds)`, so buildiq's builder can show the size of a
length and refuse one that passes `maxSize`, as its D1 asks. At this
rate two minutes is about 480 KB, under the 1 MB cap.

The recorder reuses the injectable media shape of `aiLocalDictation.js`
so it is testable without a microphone. `browserRecordingUsable()`
decides whether Record is offered; without it the field says recording
is not available in this browser.

Rejected: a higher default rate. Speech does not need it, and a clip
that passes the inline cap cannot be sent at all.

### D4. A location is one value that fills two or three properties

`CnLocationField` holds `{ lat, lng, accuracy }` under its own key. It
offers "Use my position", which calls
`navigator.geolocation.getCurrentPosition` once. When `allowMapPick` is
true (the default) it also shows a `CnMapWidget`, where a click places
or moves the pin, as `CnObjectGeoWidget` does. It always offers
latitude and longitude number inputs, so a keyboard user can enter a
position.

`CnFormPage` writes the value out at dispatch: `lat` to `latField`,
`lng` to `lngField`, `accuracy` to `accuracyField` when set, and drops
the field's own key from `effectivePayload`. In `edit` mode it seeds the
field from those properties in `initialValue`.

Rejected: one form field per coordinate. The user picks a place, not
two numbers, and a pin must move both at once.

Rejected: `CnMapPoiPicker` as the fallback. It picks a saved favourite
from a list and returns an id, not a position.

### D5. The map marks the user, and only when asked

`CnMapWidget` handles Leaflet's `locationfound` event and draws a
position marker with an accuracy circle. `CnMapPage` takes
`showUserLocation` (default false) and `centerOnUser` (default false)
and forwards both. With `showUserLocation`, the page keeps the marker up
to date each time the user presses "Show my location". With
`centerOnUser`, the page calls `locate` once when the map is ready. A
denial shows a note on the map ("Your position is not available") in
place of the console warning.

Rejected: watching the position continuously. The buildiq change rules
out tracking over time.

## Files

- `src/composables/cnFormFieldRenderer.js`: three branches, three known
  types.
- `src/components/CnSignatureField/`, `src/components/CnAudioField/`,
  `src/components/CnLocationField/`: new; exported from
  `src/components/index.js` and `src/index.js`.
- `src/composables/audioFieldRate.js`: new, the rate and size helper.
- `src/components/CnFormPage/CnFormPage.vue`: write out and seed the
  location properties.
- `src/components/CnMapWidget/CnMapWidget.vue`: `locationfound`, the
  position marker, the denial note.
- `src/components/CnMapPage/CnMapPage.vue`: `showUserLocation`,
  `centerOnUser`.
- `src/schemas/app-manifest.schema.json`, `src/schemas/app-manifest-v2.schema.json`,
  `src/utils/validateManifest.js`: the types and options.

## Security and privacy

No device is started when the form or the map mounts. The microphone
starts on Record, the position is read on "Use my position", and a map
page reads it on open only when the manifest sets `centerOnUser`. The
recorder stops its tracks on Stop, on reaching `maxSeconds`, and when
the field unmounts. Values are content, never URLs the manifest chooses,
so a manifest cannot point a field at another server. An existing
signature image is shown only through `safeHref`
(`src/utils/safeHref.js:49`).

The browser also needs the page's permission policy to allow the
microphone and the position. That is buildiq's half (its D4). Where the
policy refuses, the field reports the refusal the same way as a user's
denial.

## Accessibility

Record, Stop and Use my position are `NcButton`s with text. Recording
state changes are announced in a polite live region; the running timer
is not. The location field states the result as text ("52.09071,
5.12142, accurate to about 12 m"), and its number inputs make the map
optional. A drawn-only signature needs a pointer; WCAG 2.5.1 counts a
handwritten signature as essential, and the field's hint says it must
be drawn. With `allowTyped` the typed input is the keyboard path.

## Theming

The position marker and accuracy circle use `--color-primary-element`;
the recording indicator uses `--color-error`. No hard-coded colours.
