# Proposal: action-dialog-optional-fields

## Why

Board DqUwWachtrij's "Iets inplannen" reads "Sjabloon (niet verplicht)" over a select that asks "Kies een sjabloon
(optioneel)". CnActionDialog drew an optional field like a required one, and a select had no placeholder.

## What changes

An optional select or text field (`required: false`) draws its label above the control with "(optional)" in grey after
it, the label pointing at the control (CnFormField, as CnFormDialog does). A select takes `placeholder`.
