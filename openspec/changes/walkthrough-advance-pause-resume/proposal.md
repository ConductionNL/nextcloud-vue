# walkthrough-advance-pause-resume: the tour advances on save, pauses on ESC, and resumes

## Why

Ruben's pipelinq review on 2026-10-06 found four walkthrough faults:

- C1: "Click New and save a product" did not advance after the save. Only the index
  page's own create dispatched `cn-walkthrough:object-created`; other create paths
  (the object store used by custom forms, a related list's create form) did not. And
  while the create dialog was open, the tour's dim strips sat above it (z-index 10000),
  so clicking in the dialog clicked the dim.
- C3: ESC to close a create dialog also dismissed the tour, and the host recorded a
  dismiss as "seen", so the tour never came back.
- C4: progress lived only in memory; a reload started at step 1.
- C5: a step's element target (`index-add`) exists on every list page. A step left
  half-done on Products kept a live cutout over the Clients page's New button.

## What changes

1. `dispatchObjectCreated()` (`src/utils/walkthroughSignals.js`) announces a create
   with the register and schema slugs. The object store's `saveObject` (create),
   the index page paths and `CnObjectListWidget` call it. One create is announced once.
2. ESC and a click on the dim pause the tour (`pause` event); the tour keeps its step.
   ESC while an app dialog is open is left to that dialog. Only Skip (✕) and Finish
   complete the tour.
3. While an app dialog is open the overlay drops its dim and docks the coachmark.
4. A step's element target belongs to the page it was first found on.
5. `CnWalkthrough` emits `progress`; `CnAppRoot` stores it in
   `<completionConfigKey>-progress` plus localStorage, resumes there on the next visit
   and offers "Continue where you left off" and "Start over" in user settings.

## Impact

- `src/composables/useWalkthrough.js`, `src/components/CnWalkthrough/CnWalkthrough.vue`,
  `src/components/CnAppRoot/CnAppRoot.vue`, `src/store/useObjectStore.js`,
  `src/components/CnIndexPage/*`, `src/components/CnObjectListWidget/CnObjectListWidget.vue`,
  `src/utils/walkthroughSignals.js` (new)
- Behaviour change: `CnWalkthrough` no longer emits `dismiss` on ESC / backdrop.
  Hosts that listened for it to record completion now get `pause`.
- Apps whose preferences endpoint accepts any `[a-z0-9-]` key (pipelinq and the
  fleet's shared PreferencesController) need no change.
