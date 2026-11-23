# A saved view can be chosen to show as a gallery

## Why
OpenRegister validates and draws a gallery presentation (`records-gallery-view` 1.1, 2.1), but the view editor's
CnViewPresentationPicker offered table, board and calendar only and turned any other type back into a table, so a
gallery could not be built through the editor (task 2.3).

## What changes
CnViewPresentationPicker offers Gallery with a card title (string), an optional cover (file, files or `format: image`),
up to four card fields and a card size. `presentationCandidates` gains `cover`, `title` and `reasons.gallery`;
`isPresentationComplete` needs a title; `presentationErrorPath` routes the `gallery.*` refusals; a saved view keeps a
gallery presentation. Dutch strings added.
