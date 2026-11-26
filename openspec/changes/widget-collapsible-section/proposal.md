# Proposal: widget-collapsible-section

## Why

pipelinq's My work (requirement REQ-MW-110) has a "Recent activity" section in its side column that the user must be
able to collapse, and a collapsed section must still be collapsed after a reload. A manifest dashboard widget cannot
fold today: the layout panel can only hide a section entirely, which removes it from the page instead of leaving its
header to open it again.

## What changes

- A widget definition (or layout entry) may say `collapsible: true`. Its card draws a chevron in the header
  (`aria-expanded`, `aria-controls` on the body, "Collapse {title}" / "Expand {title}") that folds the card to its
  header and opens it again.
- On a dashboard page that keeps a per-user layout (`userLayout` or `layoutPanel`), the fold is stored with the user's
  layout record (`collapsed: true` on the widget's entry), so it survives a reload. Back to default opens every folded
  widget again. Without a user layout the fold lasts for the visit.
- No schema change: `config.widgets[]` entries are open objects. A widget without `collapsible` behaves as before.
