# Proposal: dashboard-select-filter-in-description

## Why

DqDoorlooptijd draws its case-type choice on the header's description line ("Januari tot en met september 2026 · alle
zaaktypen · Maand | Kwartaal | Jaar"). A dashboard's page filters could sit there only as a segmented group, so dossiq
mounted its own select in the header's action slot, where the board draws "Downloaden".

## What changes

A select page filter (`control` other than `segmented`) with `placement: "description"` is drawn as a compact select on
the description line, after the description and before the period group, labelled for assistive technology by its
`label`. It writes the workspace context exactly as a select in the filter row does.
