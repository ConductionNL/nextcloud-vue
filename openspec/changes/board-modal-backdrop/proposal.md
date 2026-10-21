# Proposal: board-modal-backdrop

## Why

COMPDIFF r20 measured the page behind the dialog at rgb(122, 123, 124) on DqInstellen, DqFilterBewerken and DqFilterDelen,
where the boards dim it to rgb(146, 148, 149): 45% of the text colour. CnDialog already draws that backdrop, but only
on its own container; a dialog an app opens as a plain NcDialog or NcModal kept Nextcloud's 50% black.

## What changes

In an app that takes the board look, every modal backdrop is 45% of the text colour. A page in the Nextcloud look keeps
Nextcloud's backdrop.
