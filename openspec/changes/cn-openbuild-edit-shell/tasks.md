## 1. Glyph + gating seam (no upstream deps)

- [ ] 1.1 Add `src/img/openbuild.svg` — a library-bundled copy of `openbuild/img/app.svg` so the button renders without the OpenBuild app installed.
- [ ] 1.2 Create `src/composables/useOpenBuildEditAvailability.js` — returns a reactive boolean from `useAppStatus('openbuild').enabled`; no role/permission HTTP call.
- [ ] 1.3 Unit tests: availability `true` when `OC.appswebroots.openbuild` present, `false` otherwise, and no network request is made.

## 2. Edit-mode state (depends on shipped `manifest-delta-merge-and-flex-columns`)

- [ ] 2.1 Create `src/composables/useManifestEditor.js` — holds `base` (live manifest ref), a deep-cloned `working` copy (structuredClone + JSON fallback), an `editing` flag, and a `dirty` computed (`!deepEqual(base, working)`).
- [ ] 2.2 Implement `enter()` (clone + set `editing`), `cancel()` (discard working, clear `editing`), and `save()` — compute `delta = diffManifest(base, working)`, emit/persist it, adopt `working` as `base` on success, reset `editing`/`dirty`.
- [ ] 2.3 Provide a `cnManifestEditor` holder from `CnAppRoot` so the button, grids, and modals share one `working` ref; add an injectable `cnPersistManifestDelta` seam (optional).
- [ ] 2.4 Unit tests: enter clones without mutating base; dirty toggles; save emits `diffManifest(base, working)` and `mergeManifestDelta(base, delta)` deep-equals `working`; save adopts working as base; cancel reverts.

## 3. CnOpenBuildEditButton + action menu (depends on §1, §2)

- [ ] 3.1 Create `src/components/CnOpenBuildEditButton/CnOpenBuildEditButton.vue` — Conduction-orange (`var(--c-orange-knvb, #F36C21)`) `NcActions`-triggering icon button using `src/img/openbuild.svg`; renders nothing when `available`/`canEdit` is falsey; OpenBuild-agnostic (no `useAppStatus` import).
- [ ] 3.2 Action menu items: **Edit page / Save page** toggle (label flips on `editing`; activates enter/save), **Add widget…** (DISABLED unless `editing`; opens `CnAddWidgetModal`), **Edit menu…** (opens `CnEditMenuModal`), **Edit sidebar…** (opens `CnEditSidebarModal`).
- [ ] 3.3 Emit `@save(delta)`; read the shared `cnManifestEditor` holder for `editing`/`dirty`/actions.
- [ ] 3.4 Barrel export `CnOpenBuildEditButton`, `useManifestEditor`, `useOpenBuildEditAvailability` from `src/index.js`.
- [ ] 3.5 Unit tests: hidden when `available:false`; orange glyph when `available:true`; Edit↔Save toggle; Add-widget disabled outside edit mode; menu opens each modal.

## 4. Editable body grid — `grid-widget-system` modification (depends on §2)

- [ ] 4.1 Extract a small `useGridStack` / `src/utils/gridStack.js` helper from `CnDashboardGrid`'s init so `CnWidgetGrid` reuses the same engine without duplicating GridStack setup.
- [ ] 4.2 `CnWidgetGrid`: add `editable` prop (Boolean, default `false`). When `false`, render the existing CSS grid unchanged. When `true` for the `body` slot, render a `.grid-stack` container instead (`v-if`/`v-else`) with column count `resolveSlotColumns(slotName, cnSlotColumns, columns)`.
- [ ] 4.3 On GridStack `change`, write `gridX/gridY/gridWidth/gridHeight` back into the working widget entry matched by `widget.id` (index fallback for id-less); clamp within the resolved column bound.
- [ ] 4.4 Unit tests: default path unchanged (no GridStack created); editable body mounts GridStack with resolved columns; resize writes back by id; geometry stays within resolved columns.

## 5. Edit modals (ADR-004 isolation) (depends on §2)

- [ ] 5.1 Create `src/modals/` (new dir). Add `src/modals/CnEditMenuModal.vue` — `NcModal`-based; add/remove/reorder/relabel/re-icon/re-route `manifest.menu[]` entries + `children[]`; mutates `working` only; every `NcSelect` carries `inputLabel`.
- [ ] 5.2 Add `src/modals/CnEditSidebarModal.vue` — `NcModal`-based; edit active page `page.config.sidebar` tabs/visibility; mutates `working` only; every `NcSelect` carries `inputLabel`.
- [ ] 5.3 Barrel export both modals.
- [ ] 5.4 Unit tests: menu relabel mutates working not base; sidebar tab-hide mutates working not base; both pass the modal-isolation + nc-input-labels gates.

## 6. Mounting on every page type (depends on §3, §4)

- [ ] 6.1 `CnPageRenderer` / `CnAppRoot`: mount `CnOpenBuildEditButton` immediately to the RIGHT of the page refresh control on index, detail, dashboard, and custom pages; set `available` from `useOpenBuildEditAvailability()`.
- [ ] 6.2 Render-from-working swap: provide `cnManifest = editing ? working : base` (single computed) so nav, grids, and sidebar all read the active source reactively; pass `editable="editing"` down to the `body` `CnWidgetGrid`.
- [ ] 6.3 Unit tests: button present right of refresh on each page type when available; absent + identical render when unavailable; editing swaps the rendered source to working and back on cancel.

## 7. Validation, docs, gates

- [ ] 7.1 `npm run lint` + jest green; run hydra modal-isolation + nc-input-labels gates on the two modals.
- [ ] 7.2 `openspec validate "cn-openbuild-edit-shell"` passes; 4/4 artifacts complete.
- [ ] 7.3 Component reference / docs note for `CnOpenBuildEditButton`, `useManifestEditor`, `useOpenBuildEditAvailability`, and `CnWidgetGrid.editable`.

## Dependencies

- **HARD (shipped):** `manifest-delta-merge-and-flex-columns` — `mergeManifestDelta`, `diffManifest`, `widgetEntry.id`, `mergeStrategy:'delta'`, `resolveSlotColumns` / `slotColumns`.
- **HARD (sibling change):** `cn-widget-library` — provides `CnAddWidgetModal` that the "Add widget…" menu item opens. The item ships disabled-unless-editing and becomes fully functional once that change lands.
- **HARD (separate repo):** the OpenBuild persistence change — owns the actual `baseRef + delta` storage endpoint. This change only emits `@save(delta)` / calls injected `cnPersistManifestDelta`.
- **ADRs:** ADR-004 (modal isolation, NcSelect input labels), ADR-036 (manifest model / delta-on-save contract).
