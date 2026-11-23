# A form can ask for a signature, a spoken note and a position

## Why
buildiq's form builder offers signature, audio and location fields and a map page that shows and centres on the
reader's position (`forms-signature-audio-and-location` T06, design D1 and D3). The renderer half lives here.

## What changes
- `cnRenderFormField` (and so CnFormPage) renders `signature` (CnSignatureCapture), `audio` (the new CnAudioCapture) and
  `location` (CnGeoCaptureField). A position is written into `latField` / `lngField` (and `accuracyField`) through
  `locationWrites`, and a required position checks those fields.
- CnAudioCapture records from the microphone on Record only, stops after `maxSeconds` and emits a `data:` URL.
- CnMapPage takes `showUserLocation` and `centerOnUser` and emits `user-location`.
- Dutch strings added. No schema change: form fields and map page config are open objects in the v2 schema.
