# Proposal: audit-card-compact-stacked-rows

## Why

The boards draw a stacked history row two ways. DqTaak "Historie" pads it 12px above and below (a 60px row); DqZaaktype,
DqSociaalDomein, DqHandhaving and DqTenant pad it 10px (a 56px row). The board look gave every stacked row 12px, so r34
DqZaaktype "Versie 4 gepubliceerd" read h 56 > 60, and its card opened 2px closer under the title than drawn.

## What changes

- `CnAuditTrailCard` takes `density`; `compact` marks its rows `cn-audit-card__row--compact`. The audit-trail widget
  passes `content.density`.
- Board look: a compact stacked row is padded 10px; a detail card opening on one starts 10px under the title (21px from
  the title to the first action, as DqZaaktype draws it). Without `density` nothing changes, so DqTaak keeps its 12px.
