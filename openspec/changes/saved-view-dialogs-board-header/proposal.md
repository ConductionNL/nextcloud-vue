# Proposal: saved-view-dialogs-board-header

## Why

The boards draw the saved-view dialogs (DqFilterBewerken, DqFilterDelen) as board dialogs with a 36px round close
button. CnSaveViewDialog already renders through CnDialog; the edit, share and presentation dialogs still used NcDialog
directly, so under the board look they drew NcDialog's header with a 64x49 text close button (COMPDIFF r21, confirmed by
COMPDIFF-TOOL as a real difference).

## What changes

CnSavedViewEditDialog, CnSavedViewShareDialog and CnSavedViewPresentationDialog render through CnDialog with the shared
dialog props (`dialogBoardMixin`), as CnSaveViewDialog does. In the Nextcloud look CnDialog is NcDialog unchanged.

## Scope

nextcloud-vue. Behaviour, events and labels are unchanged.
