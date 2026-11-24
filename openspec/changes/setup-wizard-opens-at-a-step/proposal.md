# Proposal: setup-wizard-opens-at-a-step

## Why

`?setup=open` opens an app's setup wizard from a link, always at its own start.
A page that knows which setting is missing has to send the user through every
step to reach it. buildiq's app store tells an admin without a shared catalogue
to connect one (`reuse-remote-store-section`, REQ-BQRS-005), and its button must
open the wizard at the step `store`.

## What changes

`CnSetupWizard` takes `startStep`: the id of a step to open on, winning over
resuming, ignored when no step has that id. `CnAppRoot` reads `?setup=<stepId>`
and opens the wizard at that step; `?setup=open` behaves as before.
