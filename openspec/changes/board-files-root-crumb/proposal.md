# The board files bar draws no trail at the root

## Why

DqZaakDocumenten draws the files card's bar as its buttons only. At the case
folder's root live drew a one-crumb trail naming the case ("Verlichting
fietspad Lindelaan") before them (r26a: toolbar 4 controls vs 3, the first
without a border, 123px wider).

## What changes

CnFilesBrowser marks its trail `--at-root` while the open folder is its root;
the board look hides the trail there. In a subfolder the trail shows as
before, and the Nextcloud look is unchanged.
