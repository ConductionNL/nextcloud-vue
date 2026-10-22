# Proposal: board-dialog-select-label-room

## Why

A board dialog raises a field's label out of NcInputField's border and lets the field reserve 26px above it.
NcSelect's search is an NcInputField inside the select, whose own margin rules win over the field's, so no room was
made and the raised label rose over whatever stood above the select. COMPDIFF r22 measured DqZaakLocatie "Locatie
toevoegen" with the label 1px over the dialog title (board 20 below), and DqZaakSamenwerken's labels sat half under
the selects above them.

## What changes

In a board dialog a select whose field has a raised label reserves the same 26px above itself. The Nextcloud look and
selects without a label are unchanged.
