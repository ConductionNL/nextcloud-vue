# Proposal: device-frames-widget

## Why

Board DqInspectie ("Inspectie in het veld") shows three phone-sized pages side by side: today's inspections offline,
a checklist question with a photo, and the sync queue, each under its own header with "Offline · gesynchroniseerd om
07:42". The library had no container that draws widget stacks as device frames.

## What changes

- New `device-frames` container widget (CnDeviceFramesWidget) for dashboards and detail pages: frames with a title, a
  status line that can follow the connection, and a stack of the page's widgets (through the `sections` widget).
- A harness page (`?deviceframes=1`) for the layout.
- No schema change (catalog widget content is not schema-constrained).
