<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

# Proposal: `CnContentBlockEditor` (not yet built)

> **Status:** proposal only. Captured during the `enrich-icon-picker-and-markdown-wysiwyg` change. No component ships yet — this document records the design so a future change can implement it.

## Motivation

OpenCatalogi's `PageContentForm.vue` contains a reusable **typed content-block authoring system** that never made it into the shared library. It lets an editor build a page out of ordered, typed blocks — the same pattern many Conduction apps need for CMS-like surfaces (landing pages, help pages, structured notes). Today each app that wants this copies the markup. This proposal extracts it into a `CnContentBlockEditor`.

## Reference implementation

`opencatalogi/src/modals/pageContents/PageContentForm.vue` — the block model, the auto-growing draggable lists, and the sanitisation are all there and battle-tested.

## Proposed component

`CnContentBlockEditor` — a `v-model`-bound editor over an **array of typed blocks**. Each block is `{ id, type, order, data, groups?, hideAfterLogin?, hideBeforeLogin? }`.

### Block types (from the reference)

| Type | `data` shape | Editor UI |
|------|--------------|-----------|
| `text` | `{ html, text }` | plain `<textarea>`; `text` is the DOMPurify-stripped plain form |
| `RichText` | `{ content }` | `CnMarkdownEditor` in `mode: 'wysiwyg'` (now available) |
| `Image` | `{ url, srcset? }` | URL + optional responsive `srcset` fields |
| `Faq` | `{ faqs: [{ question, answer }] }` | auto-growing draggable Q/A rows |
| `Quote` | `{ title, subtitle }` | two text fields |
| `ContentBlocks` | `{ blocks: [{ icon, title, text, linkUrl, linkTitle }] }` | up to N draggable blocks, each with a `CnIconPicker` (now available) |

### Behaviours to port

- **Auto-growing lists** — the "last row is always an empty placeholder; a filled last row appends a new empty one; empty non-last rows are pruned" pattern (`contentsItem.faqData` / `contentBlocksData` watchers). Sliced off on save.
- **Drag-to-reorder** — `vue-draggable-plus` (or the library's existing draggable) with a drag handle per row.
- **Sanitisation** — `text` blocks store both raw `html` and a DOMPurify-stripped `text`. Reuse the library's `safeMarkdownDompurifyConfig` / `cnRenderMarkdown` pipeline rather than importing DOMPurify directly.
- **Per-block security** — optional `groups` (NC group access) + `hideAfterLogin` / `hideBeforeLogin`, mutually exclusive. This overlaps with existing patterns; consider a shared `CnVisibilityRules` sub-editor.

### Reuse now available

This change already landed the two hardest pieces the editor needs:
- **`CnMarkdownEditor` `mode: 'wysiwyg'`** — the `RichText` block editor.
- **`CnIconPicker`** (multi-source, searchable) — the `ContentBlocks` icon field.

So a future `CnContentBlockEditor` is mostly list orchestration + the block-type dispatch, not net-new rich editors.

## Open questions

- **Renderer** — this proposal covers the *editor*. A matching `CnContentBlockRenderer` (read-side) should be a sibling so authored blocks render consistently; scope that together.
- **Persistence shape** — align the block JSON with whatever schema convention OpenRegister settles on for page content, so blocks are portable across apps.
- **Consolidation** — whether the `groups` / `hideAfter/BeforeLogin` controls become a shared `CnVisibilityRules` used here and by other per-item security editors.

## Out of scope for this document

Implementation. This is a captured design; building it is a separate OpenSpec change.
