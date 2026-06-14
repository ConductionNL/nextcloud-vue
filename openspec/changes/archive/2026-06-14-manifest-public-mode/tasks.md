# Tasks: Manifest `config.mode: 'public'` — typed + detail support

## Phase 1 — Schema

- [x] Add `mode` to `pages[].config` properties as `{ "type": "string", "enum": ["edit", "create", "public"] }` with a description.
- [x] Schema version 2.0.0 → 2.5.0.

## Phase 2 — Validator

- [x] Extract the existing form-mode enum check into a shared `validateConfigMode(cfg, pathSlash, pathBracket, errors)` helper.
- [x] Call from `case 'form':` (replacing the inline check) and from `case 'detail':` (new).

## Phase 3 — Tests

- [x] `tests/utils/validateManifest.publicMode.spec.js`:
  - omitted mode on form/detail validates.
  - mode='public' on form + detail validates.
  - mode='edit' on form + detail validates.
  - mode='create' on form + detail validates.
  - mode='guest' rejects with the path on both page types.
  - non-string mode rejects on both page types.

## Phase 4 — Docs

- [x] `docs/components/cn-form-page.md` — already documents `mode`; add a manifest-side example.
- [x] `docs/components/cn-detail-page.md` — document the manifest `mode` field even though the runtime auth-bypass branch is a follow-up.
- [x] Cross-link from #276's route-param doc as the natural pairing (`config.token: "@route.token"`).
