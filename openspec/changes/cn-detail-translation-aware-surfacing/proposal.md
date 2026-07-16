# CnDetail Translation-Aware Surfacing

## Why

OpenRegister's `i18n-source-of-truth` capability adds a
`_translationMeta` block to every object response:

```json
{
  "id": "obj-1",
  "title": "Iets",
  "sourceLanguage": "nl",
  "isSource": false,
  "_translationMeta": {
    "translatedFrom": "nl",
    "translatedAt": "2026-06-01T10:00:00Z"
  }
}
```

`_translationMeta.translatedFrom !== null` means the projection the
user is reading is a translation of a `nl` source row. The end-user
has no way to know that today — `CnDetailPage` and `CnDetailGrid`
render the projection bytes as if they were source-of-truth.

The audits of larpingapp (§3.5 / §3.6) and procest both flagged
this as the single biggest UX gap on the read side of the
translated-content path. A reader looking at a translated character
sheet thinks the translated text **is** the source — and worse, an
editor opening the same surface for editing has no signal that
their next save is going into the translated projection, not the
canonical row.

The fix is two parts: ship a tiny presentational primitive
(`CnTranslatedBadge`) that surfaces `translatedFrom`, and wire it
into `CnDetailGrid` and `CnDetailPage` so every detail surface in
every consumer app gets the badge for free.

## What Changes

- Add `src/components/CnTranslatedBadge/CnTranslatedBadge.vue` —
  a compact chip that renders
  *"(translated from {sourceLanguage})"* when the wrapped object's
  `_translationMeta.translatedFrom` is a non-empty string. Renders
  nothing otherwise. WCAG AA contrast on the chip surface. Single
  prop: `:object` (the OR object, or any object carrying
  `_translationMeta`). Optional `:locale-name-formatter` prop maps
  BCP-47 codes to display names (e.g. `'nl' → 'Nederlands'`) —
  defaults to `Intl.DisplayNames` when available, falls back to the
  raw BCP-47 string.
- Add export to `src/components/index.js` and re-export from
  `src/index.js` barrel.
- Add docs at `docs/components/cn-translated-badge.md` matching the
  format of `cn-detail-grid.md`.
- Wire `CnDetailGrid` to render `<CnTranslatedBadge :object="object"
  />` in a new `header` slot at the top of the grid, when an
  `:object` prop is passed. The badge auto-hides when
  `_translationMeta.translatedFrom` is `null` / absent. Existing
  consumers without an `:object` prop see no change.
- Wire `CnDetailPage` so the header surface — between the title
  row and the description — renders `<CnTranslatedBadge :object="…"
  />` automatically when the page resolves an object whose
  `_translationMeta.translatedFrom` is set. Reads the object from
  the existing `objectType` / `objectId` props via the bound
  `useObjectStore().getObject(type, id)` getter — no new prop. A
  new `#translation-badge` slot lets consumers override.

## Problem

Today, every consuming app that opts into `?_lang=` (see sibling
change `i18n-language-negotiation-getters`) gets translated bytes
on a detail screen with **zero UI affordance** that:

1. The text isn't authoritative — it's a projection of a source row.
2. The source language is `nl` (or whatever); editing in this
   surface will land in the `_translations[<bcp47>]` block, not the
   canonical row.
3. The translation may be stale (the `translatedAt` timestamp
   precedes the most recent source edit).

Concrete cost: larpingapp's character-sheet detail page shipped
with `?_lang=` wired but no surfacing of `_translationMeta`. Users
reported "the description is in Dutch but I'm sure I edited it in
English" — they had been editing the translated row without
realising it. Same pattern flagged in procest. Without a shared
primitive, every app re-invents this badge (or skips it). The
library should own it.

## Proposed Solution

Build the smallest possible primitive — one stateless Vue 2 SFC,
one prop — and surface it from the two detail components that
every detail-shaped app uses. The badge:

- Renders **nothing** when there's no `_translationMeta`, when
  `translatedFrom === null`, or when the object is missing. So
  existing consumers see zero visual change.
- Uses `Intl.DisplayNames` when available so users see
  *"(translated from Dutch)"* not *"(translated from nl)"*.
- Carries an explicit `:title` attribute with the `translatedAt`
  timestamp so hover reveals stale-projection warnings.
- Is fully Vue 2 Options API + `cn-` CSS prefix + Nextcloud CSS
  variables — same conventions as the rest of the library.

Wiring into `CnDetailGrid` and `CnDetailPage` is additive — both
components gain a default-rendered badge that auto-hides on
non-translated objects. Consumers retain a `#translation-badge`
slot override on `CnDetailPage` for app-specific styling.

## Out of scope

- An "edit-as-translation" affordance in `CnFormDialog` that lets
  the user choose source-vs-translation when saving. Deferred to a
  separate `cn-form-translation-toggle` change.
- Surfacing `_translationMeta` on list rows (`CnDataTable`,
  `CnCardGrid`). Deferred — detail surfaces are the highest-impact
  wins per the audit; list-side surfacing is a follow-up.
- Multi-language preview ("show me the source side by side with the
  translation"). Out of scope; that's an editor affordance.

## See also

- Hydra ADR-022 (apps consume OR abstractions)
- OR `openspec/changes/i18n-source-of-truth/` — the contract this
  change consumes.
- `openspec/changes/i18n-language-negotiation-getters/` — sibling
  read/write language-negotiation primitive; consumer apps wire
  the two changes together (read with `?_lang=`, surface with the
  badge).
- larpingapp `openspec/changes/adopt-or-abstractions/proposal.md`
  §3.5 / §3.6 — handoff pointer this change closes.
- procest `openspec/changes/adopt-or-abstractions/proposal.md` —
  same.
