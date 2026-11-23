# Tasks: walkthrough-advance-pause-resume

- [x] `dispatchObjectCreated` with register/schema slugs and a dedupe window
- [x] Dispatch from `useObjectStore.saveObject` (create), CnIndexPage paths, CnObjectListWidget
- [x] `notify` matches the signal's slugs before `@self` ids
- [x] `pause()` / `resumePaused()` / `resumeAt()` in useWalkthrough
- [x] ESC / backdrop pause; ESC ignored while an app dialog is open
- [x] Quiet mode (no dim, docked card) while an app dialog is open or the target is off-page
- [x] `progress` event; CnAppRoot persists, resumes, clears on finish; Continue / Start over in settings
- [x] Tests: `tests/composables/useWalkthroughPauseResume.spec.js`, `tests/components/CnWalkthroughModalAware.spec.js`,
      `tests/components/CnAppRootWalkthroughProgress.spec.js`, `tests/utils/walkthroughSignals.spec.js`
