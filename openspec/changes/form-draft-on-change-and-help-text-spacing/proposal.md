---
kind: code
---

# Proposal: form-draft-on-change-and-help-text-spacing

## Summary

Four fixes found in the round-6 cloud check of pipelinq, all in shared form
components, so every app gets them with a version bump.

1. Opening an edit dialog showed "Saved just now" about 1.2 seconds later with
   no input, and stored a local draft. CnFormDialog skipped only the first
   change to its values; every later change counted as typing, including an
   input reporting its own value back and the form filling in values by
   itself. A draft is now written only while a field a person edited differs
   from the value the form opened with. Undoing the edit removes the draft.
2. The draft key ended in `anonymous` although somebody was logged in: the
   user part came only from the `draftUserId` prop, which no app passed.
   CnFormDialog and CnFormPage now fall back to the signed-in Nextcloud user
   (`@nextcloud/auth` `getCurrentUser`). A draft stored under `anonymous` is
   removed, never offered and never moved, once somebody is signed in: it may
   be another person's.
3. In the board look the help text under a plain text, e-mail or number input
   started 6px above the input's bottom edge, so its top line was partly
   hidden. The board makes the input 40px tall (`--cn-field-height`), but
   NcTextField's `.input-field__main-wrapper` keeps a fixed height of
   `--default-clickable-area` (34px on Nextcloud 34). The input overflowed its
   wrapper by 6px, and our help line follows the wrapper. NcSelect grows with
   its content, which is why selects were fine. The wrapper now takes the
   field height plus its 2px focus ring.
4. A field's description was both the placeholder and the help line, so it
   showed twice. The help line is kept and the placeholder is left empty. The
   help line stays visible after somebody types (a placeholder disappears with
   the first keystroke), it is read out through `aria-describedby`, and in the
   Nextcloud look a placeholder is hidden until the field has focus anyway.
   While an error takes the help line's place, the description returns as the
   placeholder so it is not lost.

## Motivation

Ruben approved these after the round-6 check
(`audit/cloud-check-r6/pipelinq/NOTES.md`, items 3 and 6). A dialog that says
"Saved" when nobody typed is an instrument reporting activity that did not
happen, and the draft it wrote was offered back on the next open as if it
held somebody's work.

## Scope

`@conduction/nextcloud-vue` only. A patch release. No manifest schema change,
no new props, no new UI strings. New exported helpers in `useFormDraft.js`:
`resolveDraftUserId`, `clearAnonymousDrafts`, `hasDraftChanges`,
`sameDraftValue`, `DRAFT_ANONYMOUS_USER`.

## Compatibility

- A host that passes `draftUserId` keeps exactly the same key.
- A host that did not pass it now keys drafts on the signed-in user. Drafts
  stored under `anonymous` before the upgrade are removed on the first open
  by a signed-in user. That loses at most one unsaved local draft per form,
  and it is the point: they could be somebody else's.
- A page with nobody signed in keeps `anonymous`, as before.
- The board-look wrapper rule only applies under `.cn-look-board` inside
  `.cn-form-dialog__field` and `.cn-form-page__field`.
