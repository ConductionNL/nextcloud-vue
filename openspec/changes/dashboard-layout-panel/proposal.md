# Proposal: dashboard-layout-panel

## Why

The pipelinq board PqMijnWerkIndelen lets a user arrange "Mijn werk" for themselves: a "Pagina indelen" header button
opens a panel "Deze pagina indelen" with a checkbox and a drag handle per section, "Terug naar standaard" and
"Indeling opslaan". The library kept a per-user layout (`userLayout`) but only through grid drag in edit mode, and a
user could not hide a section.

## What changes

- `config.layoutPanel`: the header button and the side panel (new CnDashboardLayoutPanel).
- The per-user record keeps `hidden: true` for a hidden section; the page does not draw it.
- Saving swaps the sections' places so the page keeps its shape.
- Manifest schema 2.119.0.

A page without the key renders as before.
