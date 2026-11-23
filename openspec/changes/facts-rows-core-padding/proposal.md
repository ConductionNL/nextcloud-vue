# Proposal: facts-rows-core-padding

## Why

The boards start a facts card's list 12px under its title (DqZaak "Behandeling", DqZaakDocumenten and others; COMPDIFF
F003 on `.cn-detail-page__catalog-card`). Live the list started 24px under: the facts list is a `dl`, and Nextcloud's
core stylesheet pads every `dl` 12px at the top and bottom.

## What changes

The facts list draws no padding. Measured live with the rule applied: "Aanvrager" and "Behandeling" 24px → 12px.
