# Proposal: caption-edit-link-and-files-drop-state

Two small opt-ins that dossiq's boards ask for (design-system#152 and #148,
Ruben's decisions of 2026-10-09). Both are off unless a host asks, so no other
app changes.

## Why

1. **A caption with a pencil.** dossiq's sidebar lists the case types each user
   chose under a heading "My case types", with a pencil beside the heading that
   opens where the choice is made (board DqZijbalk). CnAppNav draws a caption
   from its label only, so the pencil has nowhere to go.
2. **The drop state on the list itself.** On the case Files tab the board draws
   a primary "Add files" button, a dashed frame with "Drop to add" centred over
   the list while files are dragged onto it, and a hint line "Or drag files
   onto this list." under it (boards DqZaakDocumenten, DqZaakDocumentenSlepen).
   CnFilesBrowser already uploads a drop through the same DAV PUT as its picker,
   but shows only an outline, says nothing to a screen reader, and keeps the
   upload inside the New menu.

## What changes

- CnAppNav: a `type: "caption"` entry that carries `href` gets a pencil link in
  `NcAppNavigationCaption`'s actions slot, named "Change {caption}". `href` is
  already a menu item property in the schema, so the schema does not change.
- CnFilesBrowser: three Boolean opt-ins with translated default labels.
  `uploadButton` adds a primary "Add files" button beside the New menu (which
  steps back to secondary) that opens the same picker. `dropOverlay` draws the
  drop state over the browser while a drag carrying files is over it, and
  announces it in a polite live region; after a drop the region says how many
  files were added. `dropHint` shows the hint line under the list. Nested
  dragenter/dragleave pairs no longer end the drag state early, and a drag
  that carries no files no longer shows it.
- CnFilesTab forwards the three opt-ins, so a manifest `files` integration
  widget can set them in its `props`.

## Impact

`src/components/CnAppNav/CnAppNav.vue`,
`src/components/CnFilesBrowser/CnFilesBrowser.vue`,
`src/components/CnObjectSidebar/CnFilesTab.vue`, `l10n/en.json`, `l10n/nl.json`.
Minor, additive.
