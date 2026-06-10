# Tasks: CnSignatureCapture

- [x] `src/components/CnSignatureCapture/CnSignatureCapture.vue` — typed + drawn capture, affirmation, audit emit.
- [x] `src/components/CnSignatureCapture/index.js` re-export.
- [x] `src/components/index.js` + `src/index.js` barrels.
- [x] `scripts/.jsdoc-baselines.json` — `CnSignatureCapture: 1`.
- [x] `tests/components/CnSignatureCapture.spec.js` (13 cases — modes, allow flags, affirmation, clear, getSignature, drawn-stroke data-URL, mode switch).
- [x] `docs/components/cn-signature-capture.md` — try-it, props/events/methods, audit-payload shape, what-this-isn't.
- [x] `openspec/changes/cn-signature-capture/{proposal,tasks}.md`.

## Follow-up (consumer)

- [ ] scholiq: replace `SignPlanModal` with a `CnWizardDialog` step hosting `CnSignatureCapture`.
