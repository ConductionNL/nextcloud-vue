# Proposal: files-column-subline

## Why

DqZaakDocumenten draws the cited ground under a partly or not public verdict: the "Deels openbaar" pill with
"grond 5.1.2.e" under it, in a muted 12px line. CnFilesBrowser draws a declared column's value only, so the row was
4px lower on the board for each cited verdict and "Weigeringsgronden tot nu toe" sat 11.7px higher on live (r45).

## What changes

- A declared files-browser column takes `subline`, a template filled from the file's `rowData` entry, drawn as a
  muted 12px second line under the value. It is left out when the template names no value.

A column without `subline` renders as before.
