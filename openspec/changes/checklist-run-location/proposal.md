# Proposal: checklist-run-location

## Why

Board DqInspectie draws "Locatie bij elk antwoord, zonder dat u iets doet": coordinates, accuracy and time beside each answer,
"Locatie onnauwkeurig (±200 m)", a manual address, and the marker "gps: matig". `CnChecklistRunWidget` already draws the questions,
notes and photos, and `CnObjectGeoWidget` places one record on a map. Nothing captures a place at the moment of recording.

## What changes

- New `CnGeoCaptureField`: the captured place in words, with a retry and an address by hand when the fix is rough or missing.
- New `captureLocation` utility, which never rejects.
- `content.captureLocation` on `CnChecklistRunWidget`: `{ field, goodAccuracy? }` stores the place with each answer.

Backward compatible: without `captureLocation` the widget never asks for a position. Covers gap 24 of the dossiq component-gap
audit (decision 281), in place of the proposed `CnInspectionChecklist`. The panel "1 van 3 voltooid" is a `CnRecordListWidget`.
