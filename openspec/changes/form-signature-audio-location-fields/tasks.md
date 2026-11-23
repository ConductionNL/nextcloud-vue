# Tasks: form-signature-audio-location-fields

> Sibling half of buildiq `forms-signature-audio-and-location`
> (REQ-BQSA-001, REQ-BQSA-003). Rows `form-signature`,
> `form-audio-record`, `pg-device-location` (buildiq). `kind: code`.
> Checkbox budget: 6 tasks x 2 = 12 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The types in the schemas and the validator
- **spec_ref**: `openspec/changes/form-signature-audio-location-fields/specs/manifest-form-logic/spec.md#requirement-form-pages-accept-signature-audio-and-location-fields`
- **files**: `src/schemas/app-manifest.schema.json`, `src/schemas/app-manifest-v2.schema.json`, `src/utils/validateManifest.js`, `tests/utils/validateManifestDeviceFields.spec.js`
- **acceptance_criteria**:
  - The three types and their options validate on form pages; a settings page rejects them; a signature with no mode and a location without `lngField` fail with the field's path
  - Existing fixtures still validate
  - Verify: jest; `npm run build:validators` leaves no diff
- [ ] Implement
- [ ] Test

### Task 2: `CnSignatureField`
- **spec_ref**: `openspec/changes/form-signature-audio-location-fields/specs/manifest-form-logic/spec.md#requirement-a-signature-is-sent-as-a-png-image`
- **files**: `src/components/CnSignatureField/`, `src/composables/cnFormFieldRenderer.js`, `src/components/index.js`, `src/index.js`, `tests/components/CnSignatureField.spec.js`
- **acceptance_criteria**:
  - Drawn and typed signatures both emit a `data:image/png` URL; an existing file shows with "Sign again"; clear emits null
  - `cnRenderFormField` returns kind `signature` and no console warning
  - Verify: jest with a canvas stub; mutation check: emitting the typed text reddens the typed test
- [ ] Implement
- [ ] Test

### Task 3: `CnAudioField` and the rate helper
- **spec_ref**: `openspec/changes/form-signature-audio-location-fields/specs/manifest-form-logic/spec.md#requirement-an-audio-field-records-a-clip-no-longer-than-its-limit`
- **files**: `src/components/CnAudioField/`, `src/composables/audioFieldRate.js`, `src/composables/cnFormFieldRenderer.js`, `tests/components/CnAudioField.spec.js`
- **acceptance_criteria**:
  - The recorder starts on Record only, stops at `maxSeconds`, stops its tracks on Stop, limit and unmount; a refusal leaves the value unchanged with a message
  - `audioClipBytes(120)` is under `FALLBACK_MAX_BYTES`
  - Verify: jest with injected `getUserMedia` and `MediaRecorder` fakes; mutation check: dropping the track stop on unmount reddens the release test
- [ ] Implement
- [ ] Test

### Task 4: `CnLocationField` and the form's write-out
- **spec_ref**: `openspec/changes/form-signature-audio-location-fields/specs/manifest-form-logic/spec.md#requirement-a-location-field-fills-the-latitude-and-longitude-properties`
- **files**: `src/components/CnLocationField/`, `src/composables/cnFormFieldRenderer.js`, `src/components/CnFormPage/CnFormPage.vue`, `tests/components/CnLocationField.spec.js`, `tests/components/CnFormPageLocation.spec.js`
- **acceptance_criteria**:
  - "Use my position", a map click and the number inputs each set `{ lat, lng, accuracy }`; nothing reads the position on mount
  - `effectivePayload` carries `latField`, `lngField`, `accuracyField` and not the field key; `edit` mode seeds from them
  - Verify: jest with a `navigator.geolocation` stub; mutation check: leaving the field key in the payload reddens the payload test
- [ ] Implement
- [ ] Test

### Task 5: The user's position on the map page
- **spec_ref**: `openspec/changes/form-signature-audio-location-fields/specs/manifest-map-widget/spec.md#requirement-a-map-page-can-show-the-users-position`
- **files**: `src/components/CnMapWidget/CnMapWidget.vue`, `src/components/CnMapPage/CnMapPage.vue`, `tests/components/CnMapPageUserLocation.spec.js`
- **acceptance_criteria**:
  - `locationfound` draws a marker and an accuracy circle when `showUserLocation` is set; `centerOnUser` calls `locate` once on map ready; a `locationerror` shows the note
  - Without either option no `locate` call is made on mount
  - Verify: jest with a mocked Leaflet
- [ ] Implement
- [ ] Test

### Task 6: Docs, accessibility and an end-to-end run
- **spec_ref**: `openspec/changes/form-signature-audio-location-fields/specs/manifest-form-logic/spec.md#requirement-form-pages-accept-signature-audio-and-location-fields`
- **files**: `docs/components/cn-signature-field.md`, `docs/components/cn-audio-field.md`, `docs/components/cn-location-field.md`, `docs/components/cn-map-page.md`, `tests/a11y/CnDeviceFields.a11y.spec.js`, `e2e/form-device-fields.e2e.js`
- **acceptance_criteria**:
  - Docs show each field's manifest block and the map options
  - A harness form with granted geolocation and a fake microphone submits a signature, a clip and a position
  - Verify: `npm run check:a11y`; `npm run check:docs`, `npm run check:docs-fresh`; `npm run test:e2e -- form-device-fields`
- [ ] Implement
- [ ] Test
