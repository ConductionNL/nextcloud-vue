# cn-walkthrough: advance on save, pause, resume

## ADDED Requirements

### Requirement: REQ-WALK-NV-PR-001 A create advances an object-created step

Every library create path SHALL dispatch `cn-walkthrough:object-created` with the register
and schema slugs and the created object, once per created object.

#### Scenario: Product saved through any form

- **GIVEN** the active step has `advanceOn: { type: 'object-created', register: 'pipelinq', schema: 'product' }`
- **WHEN** a product is created through the object store, the index page or a related list
- **THEN** the tour SHALL advance to the next step

### Requirement: REQ-WALK-NV-PR-002 ESC and the dim pause the tour

ESC and a click on the dim SHALL hide the tour and keep its step. Only Skip and Finish
SHALL complete it. ESC while an app dialog is open SHALL NOT affect the tour.

#### Scenario: Closing a create dialog with ESC

- **GIVEN** a tour is running and a create dialog is open
- **WHEN** the user presses ESC
- **THEN** the dialog SHALL close and the tour SHALL keep running

#### Scenario: Hiding the tour

- **GIVEN** a tour is running and no dialog is open
- **WHEN** the user presses ESC
- **THEN** the tour SHALL hide, SHALL NOT be recorded as seen, and SHALL continue at the same step later

### Requirement: REQ-WALK-NV-PR-003 The overlay steps back for app dialogs

While an app dialog is open the overlay SHALL render no dim and no cutout, and the
coachmark SHALL dock in a corner without taking focus.

#### Scenario: Filling in the create form

- **GIVEN** the step "Click New and save a product"
- **WHEN** the user opens the create dialog
- **THEN** every part of the dialog SHALL accept clicks

### Requirement: REQ-WALK-NV-PR-004 A step's target stays on its page

A step whose target is an element SHALL only spotlight it on the page where it was first
found.

#### Scenario: The same button on another page

- **GIVEN** the step targets `index-add` and was found on Products
- **WHEN** the user goes to Clients
- **THEN** the Clients page's New button SHALL NOT be spotlighted

### Requirement: REQ-WALK-NV-PR-005 Progress is remembered

The host SHALL store `{ tourId, stepId, index, version }` per user on every step change,
resume the tour there on the next visit, offer "Continue where you left off" and "Start
over" while a tour is unfinished, and clear it when the tour is finished or skipped.

#### Scenario: Reload mid-tour

- **GIVEN** the user reached step 3 of 12
- **WHEN** the user reloads the app
- **THEN** the tour SHALL resume at step 3
