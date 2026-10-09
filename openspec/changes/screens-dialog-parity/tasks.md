# Tasks: screens-dialog-parity

## Implementation Tasks

### Task 1: Dialogs follow the app's board look
- **spec_ref**: `openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md#requirement-dialogs-follow-the-apps-board-look`
- **files**: `src/components/CnAppRoot/CnAppRoot.vue`, `src/components/CnPageRenderer/CnPageRenderer.vue`, `src/composables/useLook.js` (new), `tests/composables/useLook.spec.js`
- [x] Implement: provide `cnLook` from the root `look` (schema key from `screens-chrome-parity`), re-provide on a page with `config.look`, a `useLook(props)` helper (prop, else inject, else `nextcloud`), `cn-look-board` on the teleported container
- [x] Test: unset, manifest key, page override, prop override; the class on the container under `document.body`

### Task 2: A dialog takes one of three widths
- **spec_ref**: `openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md#requirement-a-dialog-takes-one-of-three-widths`
- **files**: `src/css/dialog.css` (new), every dialog component listed in design.md (`src/components/Cn*Dialog/`, `src/dialogs/`)
- [x] Implement: `width` prop with the per-component default, `--cn-dialog-width` on the container in the board look (`CnDialog` wraps `NcDialog` for all 18 dialogs; `src/utils/dialogWidths.js`, `src/mixins/dialogBoard.js`)
- [x] Test: computed width per role, viewport cap at 390px (`tests/components/CnDialogBoard.spec.js` for the role to `--cn-dialog-width`; `tests/css/dialogBoard.spec.js` for the `min(var(--cn-dialog-width), calc(100% - 32px))` cap, since jsdom lays nothing out)

### Task 3: A dialog can carry an eyebrow and a subtitle
- **spec_ref**: `openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md#requirement-a-dialog-can-carry-an-eyebrow-and-a-subtitle`
- **files**: `src/components/CnDialogHeader/CnDialogHeader.vue` (new, internal), the dialog components
- [x] Implement: shared header with eyebrow, title, subtitle, round close. Deviation: the visible title is presentational (`aria-hidden`) and the dialog is labelled by NcDialog's own heading, kept in the DOM and visually hidden in the board look, so the accessible name is the title only and is not announced twice
- [x] Test: accessible name is the title only; both props ignored in the Nextcloud look

### Task 4: The board dialog frame
- **spec_ref**: `openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md#requirement-the-board-dialog-frame`
- **files**: `src/css/dialog.css`, `e2e/screens-dialog-parity.e2e.js`
- [x] Implement: radius, shadow, header, body and footer spacing, backdrop (`src/css/dialog.css`)
- [x] Test: browser measurement against `opencatalogi/OcPublicatieVerwijderen`; `noClose` while loading — measured in a browser: 640px wide, 12px radius, 1px footer hairline, 40px buttons, Cancel left of Delete, `noClose` keeps the dialog open on Escape; `e2e/screens-form-dialog-wizard-parity.e2e.js` (the library harness, not a live Nextcloud); not compared with the opencatalogi board itself

### Task 5: The footer order is fixed
- **spec_ref**: `openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md#requirement-the-footer-order-is-fixed`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnCopyDialog/CnCopyDialog.vue`, `src/components/CnDeleteDialog/CnDeleteDialog.vue`, `src/css/dialog.css`
- [x] Implement: tertiary region, Save draft moved, single Close in the result phase (CnDeleteDialog and CnCopyDialog already ended in Cancel then a primary with an icon, and one Close in the result phase; no change needed there)
- [x] Test: button order by DOM index in both looks

### Task 6: A destructive dialog states the consequence
- **spec_ref**: `openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md#requirement-a-destructive-dialog-states-the-consequence`
- **files**: `src/components/CnDeleteDialog/CnDeleteDialog.vue`, `src/components/CnMassDeleteDialog/CnMassDeleteDialog.vue`
- [x] Implement: sentence with bold name, warning note under it, `--cn-dialog-danger` fill (CnDeleteDialog, CnMassDeleteDialog, CnConfirmDialog; CnFilesWidgetDeleteDialog gets the danger fill from the shared CSS, its body is already a one-line sentence)
- [x] Test: strong element holds the name; warning renders as a note

### Task 7: Type-to-confirm keeps the button off until it matches
- **spec_ref**: `openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md#requirement-type-to-confirm-keeps-the-button-off-until-it-matches`
- **files**: `src/components/CnDeleteDialog/CnDeleteDialog.vue`, `src/components/CnMassDeleteDialog/CnMassDeleteDialog.vue`, `src/dialogs/CnConfirmDialog.vue`
- [x] Implement: `confirmValue`, the field and its hint. Deviation: the field label prop is `confirmFieldLabel`, because `confirmLabel` is already the button label of these dialogs
- [x] Test: disabled until an exact match, no emit while disabled

### Task 8: Documentation
- **files**: `docs/components/cn-delete-dialog.md`, `docs/components/cn-form-dialog.md`, `docs/design-tokens/index.md`
- [x] JSDoc on every new prop; a "Board look" section with the three widths and the theme hooks (`docs/components/cn-delete-dialog.md`, `cn-form-dialog.md`, `docs/design-tokens/index.md`)
