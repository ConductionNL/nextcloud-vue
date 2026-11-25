# Proposal: detail-cells-code-and-pills-pass-axe

## Why

OpenCatalogi runs axe at WCAG 2.2 AA on every officer page (officer-flow-accessibility, REQ-OFA-001). Three serious findings on its catalog and flow detail pages come from this library, not from the app:

- `aria-input-field-name`: CnJsonViewer's CodeMirror text area (`.cm-content`, role textbox) has no accessible name.
- `scrollable-region-focusable`: a CnDashboardGrid cell whose widget is taller than the cell scrolls, but a keyboard user cannot reach it; the same holds for a read-only CnJsonViewer.
- `color-contrast`: CnFlowLifecycleControls' published pill sets white text on `--color-success`, which Nextcloud 30 and later make a light green background (1.18:1).

## What changes

- CnJsonViewer gets a `label` prop (default "Code") that names the text area, and a read-only viewer's text area is a tab stop.
- CnDashboardGrid makes a cell a tab stop while its content scrolls and holds nothing focusable, and takes the stop away once it fits.
- The published and deprecated pills use `--color-success-text` and `--color-warning-text`, the colours Nextcloud pairs with those backgrounds.
