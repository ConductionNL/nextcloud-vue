# A file column can require another app

## Why

dossiq's Files tab has a Scan column that reads the virus scanner's verdict.
Without a scanner (such as Nextcloud's files_antivirus) every row reads "Niet
gescand", which tells nobody anything (coordinator decision, 25 Oct). A widget
can already lean on another app with `requiredApp`; a column cannot.

## What changes

- A declared CnFilesBrowser column takes `requiredApp`: an app id, or a list
  of which any one will do. When none of them is enabled for the user the
  column is left out, the way the host leaves out an undeclared one. Without
  `requiredApp` nothing changes.
