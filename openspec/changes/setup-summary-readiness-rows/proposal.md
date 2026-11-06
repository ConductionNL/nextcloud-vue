---
kind: code
---

# The closing setup step lists what is ready

## Why
Board DqInstellenKlaar closes the setup wizard with one row per item: what was set, and the screen to change it on, plus an open row for what still needs doing. CnSetupWizard's summary only recapped the steps.

## What changes
- A `summary` step takes `rows` under the board look. A row names a `step`, or stands alone with `title` and `doneWhen` on the setup status, and takes `detail`, `detailWhenOpen` and `link`.
- A step takes its own `cancelLabel` and `submitLabel`, so the last step can read "Later afmaken" and "Aan de slag".
- A `summary` step draws its `note` as an info card, and its body as the plain intro under the board look.
- Without `rows`, and outside the board look, the summary is unchanged.
